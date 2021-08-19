import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Redirect, Link } from "react-router-dom";
import "antd/dist/antd.css";
import {  StaticJsonRpcProvider, JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import "./App.css";
import { message, notification, Image, Row, Col, Button, Modal, Form, Progress, Input, Radio, Space, Divider, DemoBox, Menu, Alert, Switch as SwitchD } from "antd";
import Admin from './Admin';
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { useUserAddress } from "eth-hooks";
import { useExchangePrice, useGasPrice, useUserProvider, useContractLoader, useContractReader, useEventListener, useBalance, useExternalContractLoader, useOnBlock } from "./hooks";
import { Header, Account, Login, Faucet, Ramp, Contract, GasGauge, ThemeSwitch } from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";
import { ConsoleSqlOutlined, PropertySafetyOutlined } from "@ant-design/icons";
require('dotenv').config()


const axios = require('axios');

const serverUrl = process.env.REACT_APP_SERVER_URL;
const serverPassword = process.env.REACT_APP_SERVER_PASSWORD;
const targetNetwork = NETWORKS['mainnet']; 

const scaffoldEthProvider = new StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
const mainnetInfura = new StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
const localProviderUrl = targetNetwork.rpcUrl;
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
const localProvider = new StaticJsonRpcProvider(localProviderUrlFromEnv);
const blockExplorer = targetNetwork.blockExplorer; 



/// ============= Helper functions ============= ///

function shortenAddress(address, size) {
  return "0x"+address.slice(address.length - size);
}

function padLeadingZeros(num, size) {
  var s = num+"";
  while (s.length < size) s = "0" + s;
  return s;
}

function calcTotalProgress(obj) {
  var sum = 0;
  var count = 0;
  for( var el in obj ) {
    if( obj[el].hasOwnProperty( 'progress' ) ) {
      sum += parseFloat( obj[el]['progress'] );
      count += 1;
    }
  }
  if (count == 0) {
    return 100;
  } else {
    return Math.ceil(100*sum/count);
  }
}
    

/// ============= CREATION ============= ///

function Creation(props) {

  const [praises, setPraises] = useState(props.item.praise);
  const [burns, setBurns] = useState(props.item.burn);

  async function praise() {
    const results = await axios.post(serverUrl+'praise', {
      password: serverPassword,
      creation_id: props.item._id
    });
    setPraises(results.data.praise);
  }  

  function filterByCreator() {
    props.onFilterChange(props.item.address);
  }  

  async function burn() {
    const results = await axios.post(serverUrl+'burn', {
      password: serverPassword,
      creation_id: props.item._id
    });
    setBurns(results.data.burn);
  }  

  const imgPath = "results/"+padLeadingZeros(props.item.idx, 4)+"/image.jpg";

  return (
    <div className="creation" >
      <div className="cr_text" >
        {props.item.text_input}
      </div>
      <div className="cr_img" >
        <Image alt={props.item.text_input} src={imgPath}/>
      </div>
      <div className="cr_status" >
        {props.item.address == 0 ? '' : (
          <div onClick={filterByCreator} className="cr_creator">
            ✍️ {shortenAddress(props.item.address, 4)}
          </div>
        )}
        <div className="cr_praiseburn">
          <span onClick={praise} className="cr_praise">🙌</span> {praises}
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span onClick={burn} className="cr_burn">🔥</span> {burns}
        </div>
      </div>
    </div>
  );
}


/// ============= ALL CREATIONS ============= ///

class Creations extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      creations: [],
      loading: false,
      page: 0,
      prevY: 0
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.sort !== this.props.sort) {
      this.setState({ creations: [], page: 0, prevY: 0});
      this.getCreations(this.state.page);
    } else if (prevProps.filter !== this.props.filter) {
      this.setState({ creations: [], page: 0, prevY: 0});
      this.getCreations(this.state.page);        
    } else if (prevProps.newReady !== this.props.newReady) {
      axios({
        method: 'post',
        url: serverUrl+'get_creations',
        data: {
          password: serverPassword,
          filter_by: 'all', filter_by_task: this.props.newReady, skip: 0, limit: 1
        }
      }).then(res => {
        this.setState({ creations: [...res.data, ...this.state.creations] });
      });
    }
  }

  getCreations(page) {
    this.setState({ loading: true });
    axios({
      method: 'post',
      url: serverUrl+'get_creations',
      data: {
        password: serverPassword,
        sort_by: this.props.sort,
        filter_by: this.props.filter,
        skip: (page > 0) ? 16 * page : 0,
        limit: 16
      }
    }).then(res => {
      this.setState({ creations: [...this.state.creations, ...res.data] });
      this.setState({ loading: false });
    });
  }

  componentDidMount() {
    this.getCreations(this.state.page);
    var options = {
      root: null,
      rootMargin: "1000px",
      threshold: 1.0
    };
    this.observer = new IntersectionObserver(
      this.handleObserver.bind(this),
      options
    );
    this.observer.observe(this.loadingRef);
  }

  handleObserver(entities, observer) {
    const y = entities[0].boundingClientRect.y;
    if (this.state.prevY > y) {
      const nextPage = this.state.page + 1;
      this.getCreations(nextPage);
      this.setState({page: nextPage});
    }
    this.setState({prevY: y});
  }

  render() {
    const colCount = 3;
    const cols = [];
    this.state.creations.map(item => 
      cols.push(
        <Col key={item._id} span={24 / colCount} >
          <Creation item={item} onFilterChange={this.props.onFilterChange} />
        </Col>
      )
    )
    return (
      <div id="results">
        <Row gutter={[16, 24]} align="bottom">
          {cols}
        </Row> 
        <div
          ref={loadingRef => (this.loadingRef = loadingRef)}
          style={{height: "100px", margin: "30px"}}
        >
          <span style={{display:this.state.loading?"block":"none"}}>Loading...</span>
        </div>
      </div>
    );
  }

}


/// ============= NAVIGATION ============= ///

function QueryBar(props) {

  const [filterVisible, setFilterVisible] = useState(false);

  const changeFilter = (evt) => {
    props.onFilterChange(evt.target.value)
  }

  const changeSort = (evt) => {
    props.onSortChange(evt.target.value)
  }

  useEffect(() => {
    if (props.address) {
      setFilterVisible(props.isSigner)
    }
  }, [props.address]);

  return (
    <Space>
      <Radio.Group defaultValue="all" size="large" buttonStyle="solid" onChange={changeFilter}>
        <div style={{display: filterVisible?'block':'none'}}>
        <Radio.Button value="all">All creations</Radio.Button>
        <Radio.Button value={props.address}>My creations</Radio.Button>
        </div>
        <div style={{display: !filterVisible && props.filter != 'all'?'block':'none'}}>
        <Radio.Button value="all2">All creations</Radio.Button>
        </div>
      </Radio.Group>
      
      <Radio.Group defaultValue="newest" size="large"  buttonStyle="solid" onChange={changeSort}>
        <Radio.Button value="newest">Newest</Radio.Button>
        <Radio.Button value="praise">🙌</Radio.Button>
        <Radio.Button value="burn">🔥</Radio.Button>
      </Radio.Group>        
    </Space>
  )
}


/// ============= CREATION TOOL ============= ///

function CreationTool(props) {

  const [confirmLoading, setConfirmLoading] = React.useState(false);
  const [form] = Form.useForm();
  const [creations, setCreations] = useState({})
  const [creationsProgress, setCreationsProgress] = useState(0);
  const [address, setAddress] = useState(null);
  const [tokens, setTokens] = useState([])

  const [visibleT, setVisibleT] = useState(false);
  const [visibleS, setVisibleS] = useState(false);
  const [visibleI, setVisibleI] = useState(false);
  const [visibleSB, setVisibleSB] = useState(false);

  const showModalT = () => {setVisibleT(true)};
  const hideModalT = () => {setVisibleT(false)};
  const showModalS = () => {setVisibleS(true)};
  const hideModalS = () => {setVisibleS(false)};
  const showModalI = () => {setVisibleI(true)};
  const hideModalI = () => {setVisibleI(false)};
  const showButtonSB = () => {setVisibleSB(true)};
  const hideButtonSB = () => {setVisibleSB(true)};

  const goToDiscord = () => {window.location='https://discord.gg/4dSYwDT'};

  const updateAddress = async (props) => {
    if (props.isSigner) {
      const results = await axios.post(serverUrl+'get_tokens', {
        password: serverPassword,
        address: props.address,
        exclude_spent: true
      });
      setAddress(props.address);
      setTokens(results.data);
    } else {
      setAddress(null);
      setTokens([]);
    }
  };

  useEffect(() => {
    if (props.address) {
      updateAddress(props);
    }
  }, [props.address]);

  const runStatusChecker = async (taskId, textInput) => {
    const results = await axios.post(serverUrl+'get_status', {
      password: serverPassword,
      task_id: taskId
    });
    creations[taskId] = results.data;
    creations[taskId].textInput = textInput;
    setCreations({...creations});
    setCreationsProgress(calcTotalProgress(creations));
    if (Object.keys(creations).length > 0) {
      showButtonSB();
    }
    if (results.data.status == 'complete') {
      message.info('Creation "'+textInput+'" succeeded :)');
      setTimeout(function() {
        props.onNewReady(taskId)
      }, 2500); 
    } else if (results.data.status == 'failed') {
      message.error('Creation "'+textInput+'" failed :(');
    } else if (results.data.status == 'queued') {
      setTimeout(function() {
        runStatusChecker(taskId, textInput);
      }, 5000);  
    } else if (results.data.status == 'running') {
      setTimeout(function() {
        runStatusChecker(taskId, textInput);
      }, 2000);  
    }
  }

  const requestTokens = () => {
    setVisibleT(false);
    setConfirmLoading(false);
    showModalI();
  };

  const onSubmit = useCallback(async (values, address, tokens) => {
    setConfirmLoading(true);
    let textInput = values.textInput;
    if (address) {
      var token = tokens.length > 0 ? tokens[0].token : null;
    } else {
      var token = values.token;
    }
    console.log('the server pass', serverPassword)
    const results = await axios.post(serverUrl+'request_creation', {
      password: serverPassword,
      address: props.isSigner ? address : 0,
      text_input: textInput,
      token: token
    })
    let status = results.data.status;    
    if (status == 'failed') {
      let reason = token === null ? 'No tokens left' : results.data.output;
      message.error('Error creating "'+textInput+'": '+reason);
    } else if (status == 'queued') {
      message.info('Creation "'+textInput+'" is in Abraham\'s queue');
      let taskId = results.data.task_id;  
      setTimeout(function() {
        runStatusChecker(taskId, textInput);
      }, 5000);  
    } else if (status == 'running') {
      message.info('Abraham is creating "'+textInput+'"');
      let taskId = results.data.task_id;      
      setTimeout(function() {
        runStatusChecker(taskId, textInput);
      }, 2000);  
    }
    if ((status == 'running' || status == 'queued' && address)) {
      const tokenIdx = tokens.findIndex(item => item.token === token);
      if (tokenIdx > -1) {
        tokens.splice(tokenIdx,1);
      }
      setTokens(tokens);
      setVisibleT(false);
    }    
    setConfirmLoading(false);
  }, []);

  const closePopup = useCallback(() => {
    form.resetFields();
    setVisibleT(false);
  }, [form]);

  function RunningCreation(props) {
    if (props.creation.status === 'running') { 
      return <span>{props.creation.textInput} <Progress percent={Math.ceil(100*props.creation.progress)} status="active" /></span>
    } else if (props.creation.status === 'queued') { 
      return <span>{props.creation.textInput} <b>(Queue position {props.creation.queue_position})</b> <Progress percent={0} status="active" /></span>
    } else if (props.creation.status === 'complete') { 
      return <span>{props.creation.textInput} <Progress percent={100} /></span>
    } else if (props.creation.status === 'failed') { 
      return <span>{props.creation.textInput} <Progress percent={100} status="exception" /></span>      
    } else {
      return <span>{JSON.stringify(props.creation)}</span>      
    }
  }

  return (
    <>
      <Space>
        {visibleSB && <Button type="primary" onClick={showModalS} size='large' >
          <Progress className="progress-circle" strokeColor={'#333254'} type="circle" width={30} percent={creationsProgress} />
        </Button>}
        <Modal
          title="How to get tokens for Abraham"
          visible={visibleI}
          onOk={hideModalI}
          onCancel={hideModalI}
          footer={[
            <Button key="discord" type="primary" onClick={goToDiscord}>
              Go to Abraham Discord
            </Button>,
            <Button key="submit" type="primary" onClick={hideModalI}>
              Amen
            </Button>
          ]}
        >
          For now, please request tokens from Gene or Mayukh on the Abraham Discord or Twitter. We're currently designing a better system. Please note the tokens are fake. One day, we hope they will be real.
        </Modal>
        <Modal
          title="New Creations"
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
            {Object.keys(creations).map((key, index) => ( 
              <RunningCreation key={index} creation={creations[key]} />
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
            <Button key="submit" type="primary" loading={confirmLoading}
             onClick={tokens.length==0 && props.isSigner ? requestTokens : form.submit}>
              {tokens.length == 0 && props.isSigner ? 'How can I get tokens?' : 'Create' }
            </Button>
          ]}
        >
          <Form form={form} onFinish={(values) => onSubmit(values, address, tokens)} requiredMark={'optional'}> 
            <Form.Item name="textInput" label="Text Input" 
            rules={[{required: true}]} >
              <Input />
            </Form.Item>
            {!address ? (
              <>
              <Form.Item name="token" label="Token" 
              rules={[{required: true}]} >
                <Input />
              </Form.Item>
              </>
            ) : (
              <>
                You have {tokens.length} tokens remaining for this address.
              </>
            )}
          </Form>
        </Modal>
      </Space>
    </>
  );
};



/// ============= MAIN CREATIONS APP ============= ///

function App(props) {

  const mainnetProvider = (scaffoldEthProvider && scaffoldEthProvider._network) ? scaffoldEthProvider : mainnetInfura
  const [injectedProvider, setInjectedProvider] = useState();
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);
  
  const [newReady, setNewReady] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const isSigner = injectedProvider && injectedProvider.getSigner && injectedProvider.getSigner()._isSigner

  return (
    <div className="App">

      <div id="topbar">
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
            {/* {faucetHint} */}
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
            <QueryBar address={address} isSigner={isSigner} filter={filter} 
             onSortChange={(s) => setSort(s)} onFilterChange={(f) => setFilter(f=='all2'?'all':f)} 
            />
          </div>
          <div id="createTool">
            <CreationTool address={address} isSigner={isSigner} 
             onNewReady={(t) => setNewReady(t)} 
            />
          </div>
        </div>

      </div>
      
      <Creations filter={filter} sort={sort} newReady={newReady} onFilterChange={(f) => setFilter(f)}/>
      
      <ThemeSwitch />

    </div>
  );
}

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


function ProtectedRoute({ component: Component, ...restOfProps }) {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  
  return (
    <Route
      {...restOfProps}
      render={(props) =>
        isAuthenticated ? 
        <Component {...props} /> : 
        <Login credentials={
          {userName: 'admin', passwordHash: process.env.REACT_APP_ADMIN_PASSWORD_HASH}
        } />
      }
    />
  );
}


function Home() {
  return (
    <BrowserRouter>
      <Route path="/create" exact component={() => <App />} />
      <ProtectedRoute path="/admin" exact component={Admin} />
    </BrowserRouter>
  );
}

export default Home;