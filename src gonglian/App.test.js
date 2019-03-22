import React, {Component} from 'react'
//import SimpleStorageContract from './contracts/SimpleStorage.json'
import './App.css'

//api插件的引用
const ipfsAPI = require('ipfs-api');
//const contract = require('truffle-contract');
const Tx = require('ethereumjs-tx');
const Web3 = require('web3');
const InputDataDecoder = require('input-data-decoder-ethereum');
//const simpleStorage = contract(SimpleStorageContract)
//设置IPFS参数
const ipfs = ipfsAPI({host: 'localhost', port: '5001', protocol: 'http'});
//使用的合约的abi信息
const tokenAbi = [
	{
		"constant": false,
		"inputs": [
			{
				"name": "x",
				"type": "string"
			}
		],
		"name": "set",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "get",
		"outputs": [
			{
				"name": "",
				"type": "string"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}
]
//发送账户的秘钥
const privateKey = Buffer.from('4CC53C6CC295B6035E5DF467C4E28401C7DB183335101F0DA74B30CA98939694', 'hex')
//配置web3的httpprovider，采用infura
const web3 = new Web3(new Web3.providers.HttpProvider("https://kovan.infura.io/v3/9e57343096d241c2bcb1380c29985fb4"));
const decoder = new InputDataDecoder(tokenAbi);
//let txlogs;
let senddata; //发送数据
let gnonce; //nonce
let ttxhash;
const contractAddr = '0x58088f260d4eb1c2a555b305ce9e408df601951a';//合约地址
//"0x2A396116Ee70EB25b3878cBaD42d1b7D6E470aB0";
//"0x6f12fbbc9eba17d78a357f042682d6a0db57a1ae";
web3.eth.defaultAccount = '0x973bb07E0B22Ee5800C72c20C927E39d856aF42A';//设置使用的账户
//初始化合约信息，便于后面合约交互的abi编码发送信息
const mycontract = new web3.eth.Contract(tokenAbi,contractAddr,{
  from: '0x973bb07E0B22Ee5800C72c20C927E39d856aF42A',
  gasPrice: '1000000000'
} );
// 定义存储图片到ipfs函数
let saveImageOnIpfs = (reader) => {
  return new Promise(function(resolve, reject) {
    const buffer = Buffer.from(reader.result); //将存入的结果转成buff
    ipfs.add(buffer).then((response) => {
      console.log(response)
      resolve(response[0].hash);//传回第一个函数的哈希值
    }).catch((err) => {
      console.error(err)
      reject(err);
    })
  })
}

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      blockChainHash: null,
      address: null,
      imgHash: null,
      isWriteSuccess: false,
      txhash:null,
      blockhash:null,
      msgshow: false,
      gasused: null,
      blockhash: null
    }
  }

  componentWillMount() {

    ipfs.swarm.peers(function(err, res) {
      if (err) {
        console.error(err);
      } else {
        console.log(res);
      }
    });
  }
  
  render() {
    return (<div className="App">
      {
        this.state.address
          ? <h1>合约地址：{contractAddr}</h1>
          : <div/>
      }
      <h2>上传图片到IPFS：</h2>
      <div>
        <label id="file">Choose file to upload</label>
        <input type="file" ref="file" id="file" name="file" multiple="multiple"/>
      </div>
      <div>
        <button onClick={() => {
            const file = this.refs.file.files[0];
            const reader = new FileReader();
            // reader.readAsDataURL(file);
            reader.readAsArrayBuffer(file)
            reader.onloadend = function(e) {
              console.log(reader);
              saveImageOnIpfs(reader).then((hash) => {
                console.log('ipfs存储哈希值',hash);
                senddata = hash;
                //console.log(senddata);
                this.setState({imgHash: hash})
              });

            }.bind(this);

          }}>将图片上传到IPFS并返回图片HASH</button>
      </div>
      {
        this.state.imgHash
          ? <div>
              <h2>imgHash：{this.state.imgHash}</h2>
              <button onClick={() => {
                    //编码使用合约的函数及参数用于后续的交易
                    const encoded = mycontract.methods.set(senddata).encodeABI();
                    //获取账户的nonce
                     web3.eth.getTransactionCount(web3.eth.defaultAccount,'pending', function (err, gnonce) {
                       console.log("nonce value is ", gnonce);
                    //获取区块的gas限制
                    let gasLimit = web3.eth.getBlock("latest").gasLimit;
                    //配置交易信息rawTx
                    const rawTx = {
                          nonce: web3.utils.toHex(gnonce),
                          gasPrice: '0x3B9ACA00',
                          gasLimit: web3.utils.toHex(gasLimit),
                          gas: '0xEA60',
                          value: '0x00',
                          chainId: '0x2A',
                          to: contractAddr,
                          data: encoded
                      };
                      //tx交易签名
                        const tx = new Tx(rawTx);
                        tx.sign(privateKey);
                      //发送交易
                        const serializedTx = tx.serialize();
                        //console.log(serializedTx.toString('hex'));
                        web3.eth.sendSignedTransaction("0x" + serializedTx.toString('hex'), function (err, hash) {

                        
                            console.log("交易的哈希值Tx: " + hash);
                            ttxhash = hash;
                           

                        });  
                         
                     });


                    console.log('图片的hash已经写入到区块链！');
                    this.setState({txhash: ttxhash});
                    this.setState({isWriteSuccess: true});
                    this.setState({nonce: gnonce});
                }}>将图片hash写到区块链</button>
            </div>
          : <div/>
      }
 }
      export default App
       
