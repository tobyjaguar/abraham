import React, { useCallback, useEffect, useState } from "react";
import {
  DesktopOutlined,
  PieChartOutlined,
  FileOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import "antd/dist/antd.css";
import { message, Row, Col, Button, Modal, Form, Progress, Input, Radio, Space, Divider, DemoBox, Layout, Menu, Breadcrumb, Table, Alert, Switch as SwitchD } from "antd";
import "./App.css";


const axios = require('axios');
const serverUrl = "http://localhost:49832/"

/*
creations: filter by address
creations: click text => view creation in modal?
tokens: filter by address
tokens: find associated creation
---
eden-clip status
VMs status
*/


class AllCreations extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      creations: [],
      loading: false
    };
  }

  columns = [
    {title: 'Date created', dataIndex: 'date', sorter: {compare: (a, b) => a.date.localeCompare(b.date)}},
    {title: 'Address', dataIndex: 'address', sorter: {compare: (a, b) => a.address.localeCompare(b.address)}, render: text => <a data-id={text} onClick={this.onClick}>{text}</a>},
    {title: 'Text Input', dataIndex: 'text_input'},
    {task_id: 'Eden ID', dataIndex: 'task_id'},    
    {title: 'Praise', dataIndex: 'praise', sorter: {compare: (a, b) => a.praise - b.praise}},
    {title: 'Burn', dataIndex: 'burn', sorter: {compare: (a, b) => a.burn - b.burn}},
  ];

  onClick = (e) => {
    console.log('Content: ', e.currentTarget.dataset.id);
  }
  
  onChange(pagination, filters, sorter, extra) {}
  
  getTokens() {
    this.setState({loading: true});
    axios({
      method: 'post',
      url: serverUrl+'get_creations',
      data: {sort_by: 'newest', filter_by: 'all', skip: 0, limit: 10, format_date: true}
    }).then(res => {
      Object.keys(res.data).forEach(function(key){
        res.data[key]['key'] = res.data[key]['_id']
      });
      this.setState({creations: res.data});
      this.setState({loading: false});
    });
  }

  componentDidMount() {
    this.getTokens();
  }

  render() {
    return (
      <Table columns={this.columns} dataSource={this.state.creations} onChange={this.onChange} />
    );
  }
  
}


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
      <Table columns={this.columns} dataSource={this.state.tokens} onChange={this.onChange} />
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
    setVisible(false);
  }, []);

  const closePopup = useCallback(() => {
    form.resetFields();
    setVisible(false);
  }, [form]);

  return (
    <>
      <Button type="primary" onClick={showModal } size='large' >
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









/////////////////


function Dashboard() {
  return <div>Dashboard</div>;
}
function Meseros() {
  return <div>Meseros</div>;
}


const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

function MyComponent(){
  const [selectedMenuItem, setSelectedMenuItem]= useState('item1');
 
  const componentsSwtich = (key) => {
  switch (key) {
    case 'item1':
      return (<h1>item1</h1>);
    case 'item2':
      return (<h1>item2</h1>);
    case 'item3':
      return (<h3>item3</h3>);
    default:
      break;
   }
  };
 
 return(
  <div>
   <Menu selectedKeys={selectedMenuItem} mode="horizontal" onClick={(e) => 
         setSelectedMenuItem(e.key)}>
     <Menu.Item key="item1">your first component here</Menu.Item>
     <Menu.Item key="item2">your second here</Menu.Item>
     <Menu.Item key="item3">your third here</Menu.Item>
    </Menu>
    <div>
    {selectedMenuItem=='item1'?'hello':'there'}
    </div>
  </div>)
  }
  



  function SiderDemo() {

    const [selectedMenuItem, setSelectedMenuItem]= useState('1');
    const [collapsed, setCollapsed] = useState(false);

  
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible collapsed={collapsed} >
          <div className="logo" />
          <Menu theme="dark" defaultSelectedKeys={['1']} onClick={(e) => 
        setSelectedMenuItem(e.key)} mode="inline">
            <Menu.Item key="1" icon={<PieChartOutlined />}>
              Option 1
            </Menu.Item>
            <Menu.Item key="2" icon={<DesktopOutlined />}>
              Option 2
            </Menu.Item>
            <Menu.Item key="3" icon={<FileOutlined />}>
              Files
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Header className="site-layout-background" style={{ padding: 0 }} />
          <Content style={{ margin: '0 16px' }}>
            <div className="site-layout-background" style={{ padding: 24, minHeight: 360 }}>
              {selectedMenuItem=='1'?<><AddTokenTool/><AllTokens/></>:''}
              {selectedMenuItem=='2'?<AllCreations/>:''}
              {selectedMenuItem=='3'?'no':''}
            </div>
          </Content>
        </Layout>
      </Layout>
      );
  }















function Admin() {
    
  return (
    <>
    <AllCreations/>
    <AllTokens/>
    <AddTokenTool/>
    </>
  );
}

export default SiderDemo