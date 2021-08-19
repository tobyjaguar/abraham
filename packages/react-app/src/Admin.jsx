import React, { useCallback, useEffect, useState } from "react";
import {LogoutOutlined, CheckCircleOutlined} from '@ant-design/icons';
import "antd/dist/antd.css";
import { message, notification, Row, Col, Button, Modal, Form, Progress, Input, Radio, Space, Divider, DemoBox, Layout, Menu, Breadcrumb, Table, Alert, Switch as SwitchD } from "antd";
import "./App.css";
require('dotenv').config()

const axios = require('axios');
const serverUrl = process.env.REACT_APP_SERVER_URL;



class AllCreations extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      creations: [],
      loading: false,
      filterAddress: null
    };
  }

  columns = [
    {title: 'Date created', dataIndex: 'date', width: 10, sorter: {compare: (a, b) => a.date.localeCompare(b.date)}},
    {title: 'Address', dataIndex: 'address', width: 20, sorter: {compare: (a, b) => a.address.localeCompare(b.address)}, render: text => <a data-id={text} onClick={this.onClick}>{text}</a>},
    {title: 'Text Input', dataIndex: 'text_input', width: 32, render: text_input => <a data-id={text_input} onClick={this.onTextInputClick}>{text_input}</a>},
    {title: 'Eden ID', dataIndex: 'task_id', width: 20},    
    {title: 'Praise', dataIndex: 'praise', width: 7, sorter: {compare: (a, b) => a.praise - b.praise}},
    {title: 'Burn', dataIndex: 'burn', width: 7, sorter: {compare: (a, b) => a.burn - b.burn}},
  ];

  onTextInputClick = (e) => {
    console.log(e.currentTarget.dataset.id);
  }
  
  onClick = (e) => {
    this.getTokens(e.currentTarget.dataset.id);
  }
  
  resetFilter = (e) => {
    this.getTokens(null);
  }
  
  onChange(pagination, filters, sorter, extra) {}
  
  getTokens(filterAddress) {
    this.setState({loading: true, filterAddress: filterAddress});
    axios({
      method: 'post',
      url: serverUrl+'get_creations',
      data: {
        sort_by: 'newest', 
        filter_by: filterAddress ? filterAddress : 'all', 
        skip: 0, limit: 1000000, 
        format_date: true
      } 
    }).then(res => {
      Object.keys(res.data).forEach(function(key){
        res.data[key]['key'] = res.data[key]['_id']
      });
      this.setState({creations: res.data});
      this.setState({loading: false});
    });
  }

  componentDidMount() {
    this.getTokens(null);
  }

  render() {
    return (
      <>
      <div style={{display: this.state.filterAddress? 'block': 'none'}}>
        <Button onClick={this.resetFilter}>Reset filter</Button>
      </div>
      <Table pagination={{pageSize: 20}} scroll={{y: 800}} columns={this.columns} dataSource={this.state.creations} onChange={this.onChange} />
      </>
    );
  }
  
}


function AddTokenTool(props) {
    
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  const showModal = () => {setVisible(true)};
  const hideModal = () => {setVisible(false)};

  const onSubmit = useCallback(async (values) => {
    const results = await axios.post(serverUrl+'add_tokens', {
      amount: values.amount,
      address: values.address,
      note: values.note
    })
    let newTokens = results.data.newTokens;
    setVisible(false);
    console.log('got')
    console.log(results.data)
    console.log(newTokens)
    openNotificationWithIcon('success', newTokens);
  }, []);

  const closePopup = useCallback(() => {
    form.resetFields();
    setVisible(false);
  }, [form]);

  const openNotificationWithIcon = (type, newTokens) => {
    notification[type]({
      message: 'Tokens added successfully',
      description:
        'Added tokens: '+newTokens.join(', '),
    });
  };

  return (
    <>
      <Button value='arge' style={{width:'100%'}} type="primary" onClick={showModal } size='large' >
        Add tokens
      </Button>
      <Modal
        title="Add tokens"
        visible={visible}
        onOk={form.submit}
        onCancel={closePopup}
        footer={[
          <Button key="submit" type="primary" onClick={form.submit}>
            Add
          </Button>
        ]}
      >
        <Form form={form} onFinish={(values) => onSubmit(values)} > 
          <Form.Item name="amount" label="Amount" rules={[{required: true}]} >
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Eth address" rules={[{required: false}]} >
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Note" rules={[{required: false}]} >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    
    </>
  );
};



class AllTokens extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      tokens: [],
      loading: false
    };
  }

  columns = [
    {title: 'Date granted', dataIndex: 'date', sorter: {compare: (a, b) => a.date.localeCompare(b.date)}},
    {title: 'Note', dataIndex: 'note', sorter: {compare: (a, b) => a.note.localeCompare(b.note)}},
    {title: 'Address', dataIndex: 'address', sorter: {compare: (a, b) => a.address.localeCompare(b.address)}, render: text => <a data-id={text} onClick={this.onClick}>{text}</a>},
    {title: 'Token', dataIndex: 'token'},
    {title: 'Status', dataIndex: 'status'}
  ];

  onClick = (e) => {
    console.log('Content: ', e.currentTarget.dataset.id);
  }
  
  onChange(pagination, filters, sorter, extra) {}
  
  getTokens() {
    this.setState({loading: true});
    axios({
      method: 'post',
      url: serverUrl+'get_tokens'
    }).then(res => {
      Object.keys(res.data).forEach(function(key){
        res.data[key]['key'] = res.data[key]['_id']
      });
      this.setState({tokens: res.data});
      this.setState({loading: false});
    });
  }

  componentDidMount() {
    this.getTokens();
  }

  render() {
    return (
      <>
      <div style={{margin: 'auto', width:'100%', padding: 50}}><AddTokenTool/></div>
      <Table columns={this.columns} dataSource={this.state.tokens} onChange={this.onChange} />
      </>
    );
  }
}


function Eden() {
  return (
    <>Eden stats</>
  )
}


function Admin() {

  const [selected, setSelected]= useState('tokens');

  const {Header, Content, Footer, Sider} = Layout;

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider >
        <div className="logo" />
        <Menu theme="dark" defaultSelectedKeys={['tokens']} onClick={(e) => 
      setSelected(e.key)} mode="inline">
        <img src="/images/abraham.png" width="100%"></img>
          <Menu.Item key="tokens" icon={<CheckCircleOutlined />}>
            Tokens
          </Menu.Item>
          <Menu.Item key="creations" icon={<CheckCircleOutlined />}>
            Creations
          </Menu.Item>
          <Menu.Item key="eden" icon={<CheckCircleOutlined />}>
            Eden
          </Menu.Item>
          <Menu.Item>
            <Button size="large" onClick={handleLogout} icon={<LogoutOutlined />}>Log out</Button>
          </Menu.Item>          
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{padding: 0}} />
        <Content style={{margin: '0 16px'}}>
          <div className="site-layout-background" style={{padding: 24, minHeight: 360}}>
            {selected == 'tokens' ? <AllTokens/> : ''}
            {selected == 'creations'? <AllCreations/> : ''}
            {selected == 'eden' ? <Eden/> : ''}
          </div>
        </Content>
        <Footer>
          
        </Footer>
      </Layout>
    </Layout>
  );
}


export default Admin