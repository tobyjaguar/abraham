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

function calcTotalProgress(obj) {
  var sum = 0;
  var count = 0;
  for( var el in obj ) {
    if( obj[el].hasOwnProperty( 'progress' ) ) {
      sum += parseFloat( obj[el]['progress'] );
      count += 1;
    }
  }
  return Math.ceil(100*sum/count);
}
    
const lightBlue = '#8c8c9f';
const midBlue = '#333254';
const darkBlue = '#14133a';



/// ============= CREATION ============= ///

function Creation(props) {

  const [praises, setPraises] = useState(props.item.praise);
  const [burns, setBurns] = useState(props.item.burn);

  async function praise() {
    const results = await axios.post(serverUrl+'praise', {
      creation_id: props.item._id
    });
    console.log(results.data)
    setPraises(results.data.praise);
  }  

  async function burn() {
    const results = await axios.post(serverUrl+'burn', {
      creation_id: props.item._id
    });
    setBurns(results.data.burn);
  }  

  return (
    <div className="creation" >
      <div className="cr_text" >
        {props.item.text_input }
      </div>
      <div className="cr_img" >
        <img src={"results/"+padLeadingZeros(props.item.idx, 4)+"/image.jpg"} ></img>
      </div>
      <div className="cr_status" >
        {/* Created by: {shortenAddress(props.item.address, 4)} */}
        <span onClick={praise} className="cr_praise">🙌 {praises}</span>
        <span onClick={burn} className="cr_burn">🔥 {burns}</span>
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
    }
  }

  getCreations(page) {
    this.setState({ loading: true });
    axios({
      method: 'post',
      url: serverUrl+'get_creations',
      data: {
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
          <Creation item={item} />
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

  const changeFilter = (evt) => {
    props.onFilterChange(evt.target.value)
  }

  const changeSort = (evt) => {
    props.onSortChange(evt.target.value)
  }

  return (
    <Space>
      <Radio.Group defaultValue="all" size="large" buttonStyle="solid" onChange={changeFilter}>
        <Radio.Button value="all">All creations</Radio.Button>
        <Radio.Button value={props.address}>My creations</Radio.Button>
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
  
  const [visibleT, setVisibleT] = useState(false);
  const [visibleS, setVisibleS] = useState(false);
  const [visibleSB, setVisibleSB] = useState(false);
  
  const [status, setStatus] = useState(false);
  const [confirmLoading, setConfirmLoading] = React.useState(false);
  const [form] = Form.useForm();
  const [creations, setCreations] = useState({})
  const [creationsProgress, setCreationsProgress] = useState(0);

  const showModalT = () => {setVisibleT(true)};
  const hideModalT = () => {setVisibleT(false)};
  const showModalS = () => {setVisibleS(true)};
  const hideModalS = () => {setVisibleS(false)};
  const showButtonSB = () => {setVisibleSB(true)};
  const hideButtonSB = () => {setVisibleSB(true)};

  const runStatusChecker = async (taskId, textInput) => {
    const results = await axios.post(serverUrl+'get_status', {
      task_id: taskId
    });
    creations[taskId] = results.data;
    creations[taskId].textInput = textInput;
    setCreations({...creations});
    setStatus(creations);
    setCreationsProgress(calcTotalProgress(creations));
    if (Object.keys(creations).length > 0) {
      showButtonSB();
    }
    if (results.data.status == 'complete') {
      message.info('Creation "'+textInput+'" succeeded :)');
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

  const onSubmit = useCallback(async (values, address) => {
    setConfirmLoading(true);
    let textInput = values.textInput;
    console.log('the add is ', address)
    const results = await axios.post(serverUrl+'request_creation', {
      address: address,
      text_input: textInput
    })
    let status = results.data.status;    
    if (status == 'failed') {
      message.error('Error creating "'+textInput+'"');
    } else if (status == 'queued') {
      message.info('Creation "'+textInput+'" queued');
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
    else if (props.creation.status === 'queued') { 
      return <span>{props.creation.textInput} <b>(Queue position {props.creation.queue_position})</b> <Progress percent={0} status="active" /></span>
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
        {visibleSB && <Button type="primary" onClick={showModalS} size='large' >
          <Progress className="progress-circle" strokeColor={'#333254'} type="circle" width={30} percent={creationsProgress} />
        </Button>}
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
          <Form form={form} onFinish={(values) => onSubmit(values, props.address)} requiredMark={'optional'}> 
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


  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  const handleFilterChange = function(f) {
    setFilter(f);
  }
  const handleSortChange = function(s) {
    setSort(s);
  }

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
            <QueryBar address={address} onSortChange={handleSortChange} onFilterChange={handleFilterChange} />
          </div>
          <div id="createTool">
            <CreationTool address={address} />
          </div>
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
      {/* <Creations /> */}

      <Creations filter={filter} sort={sort}/>
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