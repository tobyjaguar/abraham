# Adapted from @advadnoun's LatentVisions notebooks

from tqdm import tqdm
import logging
import os
import glob
import random
import imageio
import kornia
import yaml
import PIL
import numpy as np
import torch
import torchvision
import torchvision.transforms as T
import torchvision.transforms.functional as TF
from torchvision import transforms, utils

import clip
from omegaconf import OmegaConf

from ml4a.utils import EasyDict
from ml4a.models import taming_transformers

DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

# is this necessary?
torch.multiprocessing.set_start_method('spawn', force=True)

# setup Taming Transformer
config = None
perceptor, preprocess = None, None
def setup_models():
    global perceptor, preprocess
    perceptor, preprocess = clip.load('ViT-B/32', jit=True)
    perceptor = perceptor.eval()
    taming_transformers.setup('vqgan')
    return perceptor



class Pars(torch.nn.Module):

    def __init__(self, image):
        super(Pars, self).__init__()
        if image is None:
            if config is None:
                sideX, sideY, channels = 256, 256, 3
                batch_size = 1
            else:
                sideX, sideY, channels = config.size[0], config.size[1], 3
                batch_size = config.batch_size
            self.normu = .5*torch.randn(batch_size, 256, sideX//16, sideY//16).cuda()
            self.normu = torch.nn.Parameter(torch.sinh(1.9*torch.arcsinh(self.normu)))
        else:
            self.image = np.array(image)#astype(np.float32)
            img = torch.unsqueeze(transforms.ToTensor()(self.image), 0) 
            img = 2.*img - 1.
            img = img.to(DEVICE).type(torch.cuda.FloatTensor)
            z, _, [_, _, indices] = taming_transformers.model.encode(img)
            self.normu = torch.nn.Parameter(z.cuda())
    
    def forward(self):
        #normu = torch.nn.functional.softmax(self.normu, dim=-1)#.view(1, 8192, 64, 64)
        #return normu
        return self.normu.clip(-6, 6)


def model(x):
    # o_i1 = taming_transformers.model.encoder(x)
    # o_i1 = x
    # o_i2 = taming_transformers.model.quant_conv(o_i1)
    o_i2 = x
    o_i3 = taming_transformers.model.post_quant_conv(o_i2)
    i = taming_transformers.model.decoder(o_i3)
    return i


def augment(into, cutn=32):
    global up_noise, scaler
    sideX, sideY, channels = config.size[0], config.size[1], 3
    into = torch.nn.functional.pad(into, (sideX//2, sideX//2, sideX//2, sideX//2), mode='constant', value=0)
    into = augs(into)
    p_s = []
    for ch in range(cutn):
        # size = torch.randint(int(.5*sideX), int(1.9*sideX), ())
        size = int(torch.normal(1.2, .3, ()).clip(.43, 1.9) * sideX)
        if ch > cutn - 4:
            size = int(sideX*1.4)
        offsetx = torch.randint(0, int(sideX*2 - size), ())
        offsety = torch.randint(0, int(sideX*2 - size), ())
        apper = into[:, :, offsetx:offsetx + size, offsety:offsety + size]
        apper = torch.nn.functional.interpolate(apper, (int(224*scaler), int(224*scaler)), mode='bilinear', align_corners=True)
        p_s.append(apper)
    into = torch.cat(p_s, 0)
    into = into + up_noise*torch.rand((into.shape[0], 1, 1, 1)).cuda()*torch.randn_like(into, requires_grad=False)
    return into


def ascend_txt():
    global lats
    out = model(lats())
    into = augment((out.clip(-1, 1) + 1) / 2, cutn)
    into = nom(into)
    iii = perceptor.encode_image(into)    
    
#     q = 0
#     for t in config.text_inputs:
#         q += (t['weight'] * t['embedding'])
#     for i in config.image_inputs:
#         q += (i['weight'] * i['embedding'])    
#     q = q / q.norm(dim=-1, keepdim=True)
#     all_s = torch.cosine_similarity(q, iii, -1)
#     return [0, -10*all_s + 5 * torch.cosine_similarity(t_not, iii, -1)]
#     return [0, -10*all_s]

    t_losses = [-t['weight'] * torch.cosine_similarity(t['embedding'], iii, -1)
                for t in config.text_inputs]
    
    i_losses = [-i['weight'] * torch.cosine_similarity(i['embedding'], iii, -1)
                for i in config.image_inputs]

    all_losses = t_losses + i_losses
#    all_losses = [a / a.norm(dim=-1, keepdim=True) for a in all_losses]
    return all_losses


def lerp(low, high, val):
    res = low * (1.0 - val) + high * val
    return res

    
def slerp(low, high, val):
    low_norm = low/torch.norm(low, dim=1, keepdim=True)
    high_norm = high/torch.norm(high, dim=1, keepdim=True)
    epsilon = 1e-7
    omega = (low_norm*high_norm).sum(1)
    omega = torch.acos(torch.clamp(omega, -1 + epsilon, 1 - epsilon))
    so = torch.sin(omega)
    res = (torch.sin((1.0-val)*omega)/so).unsqueeze(1)*low + (torch.sin(val*omega)/so).unsqueeze(1) * high
    return res


def postprocess(img, pre_scaled=True):
    img = np.array(img)[:,:,:]
    img = np.transpose(img, (1, 2, 0))
    if not pre_scaled:
        img = scale(img, 48*4, 32*4)
    img = (255.0 * img).astype(np.uint8)
    return img


def make_image():
    with torch.no_grad():
        alnot = (model(lats()).cpu().clip(-1, 1) + 1) / 2
        img = postprocess(alnot.cpu()[0])
    img = PIL.Image.fromarray(img.astype(np.uint8)).convert('RGB')
    return img


def generate(config_, img=None, callback=None):
    global config
    global augs, nom
    global perceptor
    global up_noise, scaler, dec, cutn
    global lats

    assert 'text_inputs' in config_ or 'image_inputs' in config, 'Error: no text or image inputs'
    
    if perceptor is None:
        setup_models()

    config = EasyDict(config_)
    
    config.text_inputs = config.text_inputs if 'text_inputs' in config else []
    config.image_inputs = config.image_inputs if 'image_inputs' in config else []
    config.size = config.size if 'size' in config else (512, 512)
    config.batch_size = config.batch_size if 'batch_size' in config else 1
    config.learning_rate = config.learning_rate if 'learning_rate' in config else 0.3
    config.lr_decay_after = config.lr_decay_after if 'lr_decay_after' in config else 400
    config.lr_decay_rate = config.lr_decay_rate if 'lr_decay_rate' in config else 0.995
    config.up_noise = config.up_noise if 'up_noise' in config else 0.11
    config.weight_decay = config.weight_decay if 'weight_decay' in config else 0.1
    config.cutn = config.cutn if 'cutn' in config else 32
    config.num_iterations = config.num_iterations if 'num_iterations' in config else 1000
        
    nom = torchvision.transforms.Normalize(
        (0.48145466, 0.4578275, 0.40821073), 
        (0.26862954, 0.26130258, 0.27577711)
    )
    
    augs = torch.nn.Sequential(
        torchvision.transforms.RandomHorizontalFlip(),
        torchvision.transforms.RandomAffine(24, (.1, .1))#, fill=0)
    ).cuda()

#     augs = torch.nn.Sequential(
#         kornia.augmentation.RandomHorizontalFlip(),
#         kornia.augmentation.ColorJitter(hue=.01, saturation=.01, p=.7),
#         kornia.augmentation.RandomAffine(degrees=30, translate=.1, p=.8, padding_mode='zeros'),
#     ).cuda()

    scaler = 1.0
    dec = config.weight_decay
    up_noise = config.up_noise
    cutn = config.cutn
    lr_decay_after = config.lr_decay_after
    lr_decay_rate = config.lr_decay_rate
    save_frame = 0
    
#    if not os.path.isdir(config.results_dir):
#        os.mkdir(config.results_dir)
    
#     if isinstance(img, str):
#         img = image.load_image(img)

#     if img is not None and image.get_size(img) != config.size:
#         img = image.resize(img, config.size)
            
    torch.cuda.empty_cache()
    
    
    #lats.set_from_image(img)
#    lats = lats.cuda()
    lats = Pars(img).cuda()    
    mapper = [lats.normu]
    optimizer = torch.optim.AdamW([{'params': mapper, 
                                    'lr': config.learning_rate}], 
                                  weight_decay=dec)
    
    for text_input in config.text_inputs:
        tx = clip.tokenize(text_input['text'])
        tx_embedding = perceptor.encode_text(tx.cuda()).detach().clone()
        text_input['embedding'] = tx_embedding
        
    for image_input in config.image_inputs:
        img_embedding = (torch.nn.functional.interpolate(torch.tensor(imageio.imread(image_input['path'])).unsqueeze(0).permute(0, 3, 1, 2), (224, 224)) / 255).cuda()[:,:3]
        img_embedding = nom(img_embedding)
        img_embedding = perceptor.encode_image(img_embedding.cuda()).detach().clone()
        image_input['embedding'] = img_embedding
        
    # optimize
    for itt in tqdm(range(config.num_iterations)):
        loss1 = ascend_txt()
        loss = sum(loss1)
        loss = loss.mean()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        # update learning rate and weight decay
        if itt > lr_decay_after: 
            for g in optimizer.param_groups:
                g['lr'] *= lr_decay_rate
                g['lr'] = max(g['lr'], .1)
            dec *- lr_decay_rate

        if torch.abs(lats()).max() > 5:
            for g in optimizer.param_groups:
                g['weight_decay'] = dec
        else:
            for g in optimizer.param_groups:
                g['weight_decay'] = 0
                
        if callback:
            results = {'iteration': itt+1, 
                       'num_iterations': config.num_iterations, 
                       'image': make_image()}
            callback(results)
    
    img = make_image()    
    return img



def run(config, callback):
    img = generate(config, None, callback)
    return img