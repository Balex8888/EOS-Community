import * as types from './actionsType';
import axios from 'axios';
import config from './../config.json'
import Eos from 'eosjs';
import EosApi from 'eosjs-api';
import lodash from 'lodash';
import async from 'async-es';
import DataTypes from './datatypes.js';
require('dotenv').config();

// import fetch from 'node-fetch';
// import { TextDecoder, TextEncoder } from 'text-encoding';
// const defaultPrivateKey = "5KDJZqtbfyJZmrAx97C8WB2b2V92NBm2rVi7WMFVBFuGdb5dWwQ";
// const signatureProvider = new eosjs.SignatureProvider([defaultPrivateKey], fetch);
// const { TextDecoder, TextEncoder } = require('text-encoding');
// const rpc = new eosjs.Rpc.JsonRpc('http://41.161.77.154:8888');
// const api = new eosjs.Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

// import Int64 from 'node-int64';
// var UINT64 = require('cuint').UINT64;


// everything is optional
// let options = {
//     httpEndpoint: 'https://cors-anywhere.herokuapp.com/http://54.183.9.138:8888',
//     chainId: 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f',
// }

// let eosApi = EosApi(options)

const eos = Eos({
    keyProvider: process.env.KEY_PROVIDER,// private key
    httpEndpoint: process.env.HTTP_ENDPOINT,
    chainId: process.env.CHAIN_ID
})



// const eos = Eos({
//     keyProvider: '5HtyHKqr43GQpZhLg3RWhHz59JHQqb1uQzb2QyYwz1nuEieo6QY',// private key
//     httpEndpoint: 'https://cors-anywhere.herokuapp.com/https://api.kylin-testnet.eospacex.com',
//     chainId: '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191',

// })


var myBuffer = [];
var str = 'EOS7AyWifeevBwdZamViPcboQC8k9nT86q6merJELVGBhq35PU7J6';
var buffer = new Buffer(str, 'utf16le');
for (var i = 0; i < buffer.length; i++) {
    myBuffer.push(buffer[i]);
}



export const updateState = data => ({
    type: types.UPDATE_STATE,
    payload: { data },
});

export const loadABI = data => ({
    type: types.LOAD_ABI,
    payload: { data },
})

export const loadWASM = data => ({
    type: types.LOAD_WASM,
    payload: { data },
})




// Asynchronous actions 

export const getResourcesPrice = () => {
    return async dispatch => {
        const eosMain = Eos({
            keyProvider: process.env.MAIN_KEY,// private key
            httpEndpoint: 'https://proxy.eosnode.tools',
            chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
        })

        let balance = await eosMain.getAccount('vicisnotvern');
        console.log("balance vicisnotvern: ", balance);
        await dispatch(updateState(["cpuRate", ((balance.cpu_weight / balance.cpu_limit.max) / 10000)/3]));
        await dispatch(updateState(["netRate", ((balance.net_weight / balance.net_limit.max) / 10000)/3]));
        let price = await axios(process.env.API_URL+'/getRamPrice?api_key='+process.env.API_KEY);
        await dispatch(updateState(["ramPrice", (price.data.price_per_kb_eos) / 1000]));

        //     console.log(e.target)
        //     price = this.props.ramPrice ? this.props.ramPrice : await this.props.getRamPrice();
        //     let result = (val/1000)*price;
        //     console.log("result: ", result);
        //     return result;

        // return price.data.price_per_kb_eos;
    }
}


export const loadDataAccount = e => {
    let account = e.target.value;
    return async dispatch => {
        dispatch(updateState(["account", account]));
        try {
            let balance = await axios(process.env.URL_ACCOUNT_RESOURCES + account + '?api_key=' + process.env.API_KEY);
            console.log(balance);
            await dispatch(updateState(["balance", balance.data.core_liquid_balance]));
            await dispatch(updateState(["cpu", balance.data.cpu_limit]));
            await dispatch(updateState(["net", balance.data.net_limit]));
            let staking = {
                staked: balance.data.voter_info.staked / 10000,
                unstaked: Number(balance.data.core_liquid_balance.split(' ')[0]),
            }

            let ram = {
                used: balance.data.ram_usage,
                available: balance.data.ram_quota - balance.data.ram_usage,
                max: balance.data.ram_quota
            }
            
            await dispatch(updateState(["ram", ram]));
            await dispatch(updateState(["staking", staking]));
            console.log(balance)
        } catch (error) {
            return;
        }

    }
}

function array_move(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr; // for testing
};



export const estimateContract = (account) => {
    return async (dispatch, getState) => {
        console.log()
        let abi = getState().abi;
        let bill = {};
        let actions = [...abi.actions];
        let actionName = actions.map(el => {
            return el.name;
        })
        if(actionName.includes('transfer') && actionName.includes('create') && actionName.includes('issue')) {
            let oldIndexCreate = actions.indexOf(lodash.find(actions, ['name', 'create']));
            array_move(actions, oldIndexCreate, 0);

            let oldIndexIssue = actions.indexOf(lodash.find(actions, ['name', 'issue']));
            array_move(actions, oldIndexIssue, 1);

            let oldIndexTransfer = actions.indexOf(lodash.find(actions, ['name', 'transfer']));
            array_move(actions, oldIndexTransfer, 2);

        }
        console.log(actions);
        // if (lodash.find(actions, ['name', 'withdraw']) === undefined) actions.push({ name: "withdraw" });
        // if (lodash.find(actions, ['name', 'deposit']) === undefined) actions.push({ name: "deposit" });

        dispatch(updateState(["progress", 41]));

        const fetch = async (action, callback) => {
    
            let dataTypes = new DataTypes(account, buffer);
        
            let acts = [];
            let data = {};
            let usage = {};
            if(action.name !== 'deposit' && action.name !== 'withdraw') {
            let field = lodash.find(abi.structs, ['name', action.name])
            field.fields.forEach(arg => {
                data[arg.name] = dataTypes[arg.type];
        
            });
        
            acts.push(
                {
                    account: account,
                    name: action.name,
                    authorization: [{
                        actor: account,
                        permission: 'active'
                    }],
                    data
                });
            }
        
            try {
                let respTransac;
                let ramBefore;
                let ramAfter;
                if (action.name === 'create') {
                    acts[0].data.maximum_supply = '1.0000 SYS';

                } else if (action.name === 'issue') {
                    acts[0].data.quantity = '0.0010 SYS';

                } else if (action.name === 'transfer') {
                    acts[0].data.to = 'ideos';
                    acts[0].data.quantity = '0.0001 SYS';
                }  
    
                
                dispatch(updateState(["progress", getState().progress + 3]));
                ramBefore = await eos.getAccount(account);
                respTransac = await eos.transaction({ actions: acts });
                console.log("resp Transac: ", respTransac);
                ramAfter = await eos.getAccount(account);
                
        
                usage.ram = ramAfter.ram_usage - ramBefore.ram_usage;
                usage.net = respTransac.processed.net_usage;
                usage.cpu = respTransac.processed.receipt.cpu_usage_us;
        
                bill[action.name] = usage;
        
                await dispatch(updateState(["bill", bill]));
                dispatch(updateState(["progress", getState().progress + 1]))
                
        
            } catch (error) {
                if (typeof error === 'string') {
                    let err = JSON.parse(error);
                    console.log(action.name, ": ", err);
                } else console.log(error);
                
        
            }

            callback();
        
        }
        let q = async.queue(fetch, 1);
        console.log("q async: ", q);

        q.push(actions, (err) => {
                q.workersList().forEach(el => {console.log("Currently : ", el.name);
            });
                if (err) console.log(err);
            })


        q.drain = function() {
                dispatch(updateState(["bill", bill]));
                let props = getState();
                let data = []
                var [cpuT, ramT, netT, eosT] = [[], [], [], []];
                console.log("in generateCSV: ", props.bill);
                for (let action in props.bill) {
                    let obj = {};
                    obj.action = action;
    
                    obj.cpu_us = props.bill[action].cpu;
                    cpuT.push(obj.cpu_us);
    
                    obj.ram_bytes = props.bill[action].ram;
                    ramT.push(obj.ram_bytes);
    
                    obj.net_bytes = props.bill[action].net;
                    netT.push(obj.net_bytes);
                   
                    obj.total_EOS = ((obj.cpu_us * getState().cpuRate) + (obj.net_bytes * getState().netRate) + (obj.ram_bytes * getState().ramPrice)).toFixed(4)
                    eosT.push(Number(obj.total_EOS));
    
                    data.push(obj);
    
                }

                try {
    
                let cT = cpuT.reduce((a, b) => { a = a + b; return a; });
                let rT = ramT.reduce((a, b) => { a = a + b; return a; });
                let nT = netT.reduce((a, b) => { a = a + b; return a; });
                let eT = eosT.reduce((a, b) => { a = a + b; return a; });
                data.push({ action: 'Total runtime cost', cpu_us: cT, ram_bytes: rT, net_bytes: nT, total_EOS: eT });
                data.push({ action: 'EOS Equivalent', ram_bytes: (rT*getState().ramPrice).toFixed(4), cpu_us: (cT*getState().cpuRate).toFixed(4), net_bytes: (nT*getState().netRate).toFixed(4)})
                data.push({ action: 'Total design cost', ram_bytes: props.deploymentRam, cpu_us: props.deploymentCpu, net_bytes: props.deploymentNet, total_EOS: (props.totalDeployment).toFixed(4) });
                data.push({ action: 'Overall cost (EOS)', total_EOS: (((cT+props.deploymentCpu) * getState().cpuRate) + ((rT+props.deploymentRam) * getState().ramPrice) + ((nT+props.deploymentNet) * getState().netRate)).toFixed(4)});
                
                dispatch(updateState(["cpuTotal", cT]));
                dispatch(updateState(["ramTotal", rT]));
                dispatch(updateState(["netTotal", nT]));
                dispatch(updateState(["csvData", data]));
                let ramTotal = getState().csvData.map(x => {
                    if (x.action === "Total design cost" || x.action === "Overall EOS" || x.action === "EOS Equivalent" || x.action === "Total runtime cost") return 0;
                    else return x.ram;
                }).reduce((a, b) => {
                    a = a + b;
                    return a;
                }, 0)
                console.log("ramTotal: ", ramTotal);
            } catch(error) {
                console.log(error)
            }
    
                
    
    
                dispatch(updateState(["progress", 100]));
    
                return bill;
               
            };
        }

}
