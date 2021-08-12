import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import "antd/dist/antd.css";
import {  StaticJsonRpcProvider, JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import "./App.css";
import { message, Row, Col, Button, Modal, Form, Progress, Input, Radio, Space, Divider, DemoBox, Menu, Alert, Switch as SwitchD } from "antd";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useUserAddress } from "eth-hooks";
import { useExchangePrice, useGasPrice, useUserProvider, useContractLoader, useContractReader, useEventListener, useBalance, useExternalContractLoader, useOnBlock } from "./hooks";
import { Header, Account, Faucet, Ramp, Contract, GasGauge, ThemeSwitch } from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
//import Hints from "./Hints";
//import { Hints, ExampleUI, Subgraph } from "./views"
//import { useThemeSwitcher } from "react-css-theme-switcher";
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";
// import Item from "antd/lib/list/Item";



const axios = require('axios');









const serverUrl = "http://localhost:49832/"
const targetNetwork = NETWORKS['mainnet'];  // localhost, rinkeby, xdai, mainnet
const DEBUG = false


// 🛰 providers
if(DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = new StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
const mainnetInfura = new StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID )

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if(DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new StaticJsonRpcProvider(localProviderUrlFromEnv);

const blockExplorer = targetNetwork.blockExplorer; // 🔭 block explorer URL



/// ============= Helper functions ============= ///

function shortenAddress(address, size) {
  return "0x"+address.slice(address.length - size);
}

function padLeadingZeros(num, size) {
  var s = num+"";
  while (s.length < size) s = "0" + s;
  return s;
}



/// ============= CREATION ============= ///

function Creation(props) {

  return (
    <div className="creation" >
      <div className="cr_text" >
        {props.item.text_input }
      </div>
      <div className="cr_img" >
        <img src={"results/"+padLeadingZeros(props.item.idx, 4)+"/image.jpg"} ></img>
      </div>
      <div className="cr_status" >
        {shortenAddress(props.item.address, 4)}
        <span className="cr_praise">🙌 {props.item.praise}</span>
        <span className="cr_burn">🔥 {props.item.burn}</span>
      </div>
    </div>
  );
}


/// ============= ALL CREATIONS ============= ///

class Creations extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      items: []
    };
  }

  componentDidMount() {
    fetch(serverUrl+'get_creations')
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            isLoaded: true,
            items: result
          });
        },
        (error) => {
          this.setState({
            isLoaded: true,
            error
          });
        }
      )
  }

  render() {
    const { error, isLoaded, items } = this.state;
    if (error) {
      return <div>Error: {error.message}</div>;
    } 
    else if (!isLoaded) {
      return <div>Loading...</div>;
    } 
    else {
      const colCount = 3;
      const cols = [];
      items.map(item => 
        cols.push(
          <Col key={item._id} span={24 / colCount} >
            <Creation item={item} />
          </Col>
        )
      )    
      return (
        <div id="results">
          <Row gutter={[16, 16]} align="bottom">
            {cols}
          </Row>          
        </div>
      );
    }    
  }
}



/// ============= CREATION TOOL ============= ///

function CreationTool(props) {

  const [visibleT, setVisibleT] = useState(false);
  const [visibleS, setVisibleS] = useState(false);
  const [status, setStatus] = useState(false);
  const [confirmLoading, setConfirmLoading] = React.useState(false);
  const [form] = Form.useForm();
  const [creations, setCreations] = useState({})
  
  const showModalT = () => {setVisibleT(true)};
  const showModalS = () => {setVisibleS(true)};
  const hideModalT = () => {setVisibleT(false)};
  const hideModalS = () => {setVisibleS(false)};
  
  const runStatusChecker = async (taskId, textInput) => {
    const results = await axios.post(serverUrl+'get_status', {
      task_id: taskId
    });
    creations[taskId] = results.data;
    creations[taskId].textInput = textInput
    setCreations({...creations})
    setStatus(creations);
    if (results.data.status == 'complete') {
      message.info('Creation "'+textInput+'" succeeded :)');
    } else if (results.data.status == 'failed') {
      message.error('Creation "'+textInput+'" failed :(');
    } else if (results.data.status == 'running') {
      setTimeout(function() {
        runStatusChecker(taskId, textInput);
      }, 2500);  
    }
  }

  const onSubmit = useCallback(async (values) => {
    setConfirmLoading(true);
    let textInput = values.textInput;
    const results = await axios.post(serverUrl+'request_creation', {
      address: 'address',
      text_input: textInput
    })
    let status = results.data.status;    
    if (status == 'failed') {
      message.error('Error creating "'+textInput+'"');
    } else if (status == 'running') {
      let taskId = results.data.task_id;      
      message.info('Abraham is creating "'+textInput+'"');
      runStatusChecker(taskId, textInput)
    }
    setVisibleT(false);
    setConfirmLoading(false);
  }, []);

  const closePopup = useCallback(() => {
    form.resetFields();
    setVisibleT(false);
  }, [form]);

  function RunningCreation(props) {
    if (props.creation.status === 'running') { 
      return <span>{props.creation.textInput} <Progress percent={Math.ceil(100*props.creation.progress)} status="active" /></span>
    } 
    else if (props.creation.status === 'complete') { 
      return <span>{props.creation.textInput} <Progress percent={100} /></span>
    } 
    else if (props.creation.status === 'failed') { 
      return <span>{props.creation.textInput} <Progress percent={100} status="exception" /></span>      
    } 
    else {
      return <span>{JSON.stringify(props.creation)}</span>      
    }
  }

  return (
    <>
      <Space>
        <Button type="primary" onClick={showModalS} size='large' >
          <Progress type="circle" width={30} percent={75} />
        </Button>
        <Modal
          title="Creations status"
          visible={visibleS}
          onOk={hideModalS}
          onCancel={hideModalS}
          footer={[
            <Button key="submit" type="primary" onClick={hideModalS}>
              Amen
            </Button>
          ]}
        >
          <div>      
            {Object.keys(status).map((key, index) => ( 
              <RunningCreation key={index} creation={status[key]} />
            ))}
          </div>
        </Modal>
        <Button type="primary" onClick={showModalT} size='large' >
          Create with Abraham
        </Button>
        <Modal
          title="Create with Abraham"
          visible={visibleT}
          onOk={form.submit}
          onCancel={closePopup}
          confirmLoading={confirmLoading}
          footer={[
            <Button key="submit" type="primary" loading={confirmLoading} onClick={form.submit}>
              Create
            </Button>
          ]}
        >
          <Form form={form} onFinish={onSubmit} requiredMark={'optional'}> 
            <Form.Item name="textInput" label="Text Input" 
            rules={[{required: true}]} >
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </>
  );
};








function App(props) {

  /* modal*/
  // const [ showCT, setShowCT ] = useState(false);
  // const [ showCS, setShowCS ] = useState(false);

  const [isCTVisible, setIsCTVisible] = useState(false);
  const showCT = () => {setIsCTVisible(true)};  
  const handleCTOk = () => {setIsCTVisible(false)};

  /*
  const [confirmCTLoading, setConfirmCTLoading] = React.useState(false);
  const [CTText, setCTText] = React.useState('Content of the modal');

  const handleCTOk = () => {
    setCTText('The modal will be closed after two seconds');
    setConfirmCTLoading(true);
    setTimeout(() => {
      setIsCTVisible(false);
      setConfirmCTLoading(false);
    }, 4000);
  };
  */

  const handleCTCancel = () => {setIsCTVisible(false)};

  const [isCSVisible, setIsCSVisible] = useState(false);
  const showCS = () => {setIsCSVisible(true)};  
  const handleCSOk = () => {setIsCSVisible(false)};
  const handleCSCancel = () => {setIsCSVisible(false)};

  const [ loadingCS, setLoadingCS ] = useState()
  const [ loadingCT, setLoadingCT ] = useState()





  ///////// CREATIONS
  //const [ creations, setCreations] = useState({})





  const mainnetProvider = (scaffoldEthProvider && scaffoldEthProvider._network) ? scaffoldEthProvider : mainnetInfura

  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  //const price = useExchangePrice(targetNetwork,mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork,"fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);

  // You can warn the user if you would like them to be on a specific network
  let localChainId = localProvider && localProvider._network && localProvider._network.chainId
  let selectedChainId = userProvider && userProvider._network && userProvider._network.chainId

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice)

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice)

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  //const yourMainnetBalance = useBalance(mainnetProvider, address);

  // Load in your local 📝 contract and read a value from it:
  //const readContracts = useContractLoader(localProvider)

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  //const writeContracts = useContractLoader(userProvider)

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
//  const mainnetDAIContract = useExternalContractLoader(mainnetProvider, DAI_ADDRESS, DAI_ABI)

  // If you want to call a function on a new block
  // useOnBlock(mainnetProvider, () => {
  //   console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`)
  // })

  // Then read your DAI balance like:
  //const myMainnetDAIBalance = useContractReader({DAI: mainnetDAIContract},"DAI", "balanceOf",["0x34aA3F359A9D614239015126635CE7732c18fDF3"])

  // keep track of a variable from the contract in the local React state:
  //const purpose = useContractReader(readContracts,"YourContract", "purpose")

  //📟 Listen for broadcast events
  //const setPurposeEvents = useEventListener(readContracts, "YourContract", "SetPurpose", localProvider, 1);

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(()=>{
    if(DEBUG && mainnetProvider && address && selectedChainId && yourLocalBalance /*&&  yourMainnetBalance &&readContracts && writeContracts && mainnetDAIContract*/){
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________")
      console.log("🌎 mainnetProvider",mainnetProvider)
      console.log("🏠 localChainId",localChainId)
      console.log("👩‍💼 selected address:",address)
      console.log("🕵🏻‍♂️ selectedChainId:",selectedChainId)
      console.log("💵 yourLocalBalance",yourLocalBalance?formatEther(yourLocalBalance):"...")
      /*console.log("💵 yourMainnetBalance",yourMainnetBalance?formatEther(yourMainnetBalance):"...")*/
    /*  console.log("📝 readContracts",readContracts) */
      /*console.log("🌍 DAI contract on mainnet:",mainnetDAIContract)*/
    /*  console.log("🔐 writeContracts",writeContracts) */
    }
  }, [mainnetProvider, address, selectedChainId, yourLocalBalance, /*yourMainnetBalance, readContracts, writeContracts, mainnetDAIContract*/])


  let networkDisplay = ""
  if(localChainId && selectedChainId && localChainId != selectedChainId ){
    networkDisplay = (
      <div style={{zIndex:2, position:'absolute', right:0,top:0,padding:16}}>
        <Alert
          message={"⚠️ Wrong Network"}
          description={(
            <div>
              You have <b>{NETWORK(selectedChainId).name}</b> selected and you need to be on <b>{NETWORK(localChainId).name}</b>.
            </div>
          )}
          type="error"
          closable={false}
        />
      </div>
    )
  }else{
    networkDisplay = (
      <div style={{zIndex:-1, position:'absolute', right:154, top:8, padding:16, color:targetNetwork.color}}>
        {targetNetwork.name}
      </div>
    )
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname)
  }, [setRoute]);

  let faucetHint = ""
  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name == "localhost"

  const [ faucetClicked, setFaucetClicked ] = useState( false );
  if(!faucetClicked&&localProvider&&localProvider._network&&localProvider._network.chainId==31337&&yourLocalBalance&&formatEther(yourLocalBalance)<=0){
    faucetHint = (
      <div style={{padding:16}}>
        <Button type={"primary"} onClick={()=>{
          faucetTx({
            to: address,
            value: parseEther("0.01"),
          });
          setFaucetClicked(true)
        }}>
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    )
  }


  const isSigner = injectedProvider && injectedProvider.getSigner && injectedProvider.getSigner()._isSigner

  
  const [ result, setResult ] = useState()

  let display = ""
  if(result){
    let possibleTxId = result.substr(-66)
    console.log("possibleTxId",possibleTxId)
    let extraLink = ""
    if(possibleTxId.indexOf("0x")==0){
      extraLink = <a href={blockExplorer+"tx/"+possibleTxId} target="_blank">view transaction on etherscan</a>
    }else{
      possibleTxId=""
    }
    display = (
      <div style={{marginTop:32}}>
        {result.replace(possibleTxId,"")} {extraLink}
      </div>
    )

  } else if(isSigner){
    display = (

      // <Button loading={loading} style={{marginTop:32}} type="primary" onClick={async ()=>{
        <Button style={{marginTop:32}} type="primary" onClick={async ()=>{

        //setLoading(true)
        try{
          const msgToSign = await axios.get(serverUrl)
          console.log("msgToSign",msgToSign)
          if(msgToSign.data && msgToSign.data.length > 32){//<--- traffic escape hatch?
            // let currentLoader = setTimeout(()=>{setLoading(false)},4000)
            let message = msgToSign.data.replace("**ADDRESS**",address)
            let sig = await userProvider.send("personal_sign", [ message, address ]);
            // clearTimeout(currentLoader)
            // currentLoader = setTimeout(()=>{setLoading(false)},4000)
            const res = await axios.post(serverUrl+'reqtest', {
              address: address,
              message: message,
              signature: sig,
            })
            // clearTimeout(currentLoader)
            //setLoading(false)
            console.log("RESULT:",res)

            if(res.data){
              // setResult(res.data)
              console.log(res.data)
              console.log('fgjhfg')
            }
          }else{
            //setLoading(false)
            setResult("😅 Sorry, the server is overloaded. Please try again later. ⏳")
          }
        }catch(e){
          message.error(' Sorry, the server is overloaded. 🧯🚒🔥');
          console.log("FAILED TO GET...")
        }
      }}>

        <span style={{marginRight:8}}>🔏</span>  sign a message with your ethereum wallet
      </Button>
    )
  }


  function Navigator(props) {
    
    const changeView = (evt) => {
      const view = evt.target.value;
      console.log("view is", view)
    }

    const changeSort = (evt) => {
      const sort = evt.target.value;
      console.log("sort is", sort)
    }

    return (
      <Space>
        <Radio.Group defaultValue="all" size="large" buttonStyle="solid" onChange={changeView}>
          <Radio.Button value="all">All creations</Radio.Button>
          <Radio.Button value="my">My creations</Radio.Button>
        </Radio.Group>
        <Radio.Group defaultValue="new" size="large"  buttonStyle="solid" onChange={changeSort}>
          <Radio.Button value="new">Newest</Radio.Button>
          <Radio.Button value="praise">🙌</Radio.Button>
          <Radio.Button value="burn">🔥</Radio.Button>
        </Radio.Group>        
      </Space>
    )
  }




  return (
    <div className="App">

      <div id="navbar">

        <div id="navbar_account" >
          <Account
            connectText={"Connect Ethereum Wallet"}
            onlyShowButton={!isSigner}
            address={address}
            localProvider={localProvider}
            userProvider={userProvider}
            mainnetProvider={mainnetProvider}
            price={999}  // should be price
            web3Modal={web3Modal}
            loadWeb3Modal={loadWeb3Modal}
            logoutOfWeb3Modal={logoutOfWeb3Modal}
            blockExplorer={blockExplorer}
          />
          {faucetHint}         
        </div>

        <div id="navbar_sections">
          <ul>
            <li><a href="/"><img src="images/abraham.png" height="80px"></img></a></li>
            <li><a href="/create">Creations</a></li>
            <li><a href="/scripture">Scripture</a></li>
          </ul>
        </div>

      </div>

    <div id="toolbar">
      <div id="views">
        <Navigator />
      </div>
      <div id="createTool">
        <CreationTool />
      </div>
    </div>
      
      {/* {networkDisplay} */}
      


      
      
      {/* {display} */}
      
      {/* <Button loading={loadingCT} style={{margin:32, fontSize:"2.0em", height:"2.0em"}} type="primary" onClick={showCT}>
        Create
      </Button>
      <Modal title="Creation tool" visible={isCTVisible} onOk={handleCTOk} onCancel={handleCTCancel}>
        <CreationTool creations={creations} onSubmit={() => setIsCTVisible(true)} />
      </Modal>



      <Button loading={loadingCS} style={{margin:32, fontSize:"2.0em", height:"2.0em"}} type="primary" onClick={showCS}>
        Status of creations
      </Button>
      <Modal title="Creations Status" visible={isCSVisible} onOk={handleCSOk} onCancel={handleCSCancel}>
        <StatusCreations creations={creations} setCreations={setCreations} onSubmit={() => setIsCSVisible(false)} />
      </Modal> */}


      <p>&nbsp;</p>
      <Creations />

      
      <ThemeSwitch />


    </div>
  );
}





// useEffect(() => {
//   if (web3Modal.cachedProvider) {
//     loadWeb3Modal();
//   }
// }, [loadWeb3Modal]);


// const launchCreateModal = async () => {
//   await web3Modal.clearCachedProvider();
//   setTimeout(() => {
//     window.location.reload();
//   }, 1);
// };



/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

 window.ethereum && window.ethereum.on('chainChanged', chainId => {
  web3Modal.cachedProvider &&
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

 window.ethereum && window.ethereum.on('accountsChanged', accounts => {
  web3Modal.cachedProvider &&
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

export default App;