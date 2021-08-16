import React, { useCallback, useEffect, useState } from "react";
import { Table } from 'antd';
import "antd/dist/antd.css";
import { message, Row, Col, Button, Modal, Form, Progress, Input, Radio, Space, Divider, DemoBox, Menu, Alert, Switch as SwitchD } from "antd";
import "./App.css";


const axios = require('axios');
const serverUrl = "http://localhost:49832/"

/*
creations: filter by address
creations: click text => view creation in modal?
tokens: filter by address
---


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
    {title: 'Creation', dataIndex: 'creation'}
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


function Admin() {
    
  return (
    <>
    <AllCreations/>
    <AllTokens/>
    <AddTokenTool/>
    </>
  );
}

export default Admin