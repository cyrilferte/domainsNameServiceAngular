import {ChangeDetectorRef, Component} from '@angular/core';
import {Injectable} from '@angular/core';
import Web3 from 'web3';

declare let window: any;
import * as contractAbi from './utils/contractABI.json';
import {Signer, utils, providers, Wallet, Contract, Event} from 'ethers';
import {FormControl, Validators} from "@angular/forms";
import {environment} from "../environments/environment";
//import detectEthereumProvider from '@metamask/detect-provider';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'domains-coddit-frontend';
  CONTRACT_ADDRESS = environment.CONTRACT_ADDRESS;
  networkChainId = environment.networkChainId;
  domain = '';
  record = '';
  account: string | undefined;
  contractAbiObj = (contractAbi as any)
  username = new FormControl('', [Validators.required]);
  tagline = new FormControl('', [Validators.required]);
  networkIsPolygonMumbai = false;
  names: any;
  provider: any;

  constructor(private cdr: ChangeDetectorRef) {
    window.ethereum.on('accountsChange', (accounts:any) => {
      console.log(accounts);
      this.loadWeb3().then(r => {})

    })
    window.ethereum.on('chainChanged', (id:any) => {
      console.log(id);
      this.loadWeb3().then(r => {})

    })
  }

  async loadWeb3() {
    // this.provider = await detectEthereumProvider();
    await this.checkIfWalletIsConnected()
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum.currentProvider);
      let accounts = await window.ethereum.request({method: "eth_requestAccounts"});
      this.account = accounts[0]
      console.log('account', accounts[0])
      this.fetchMints()
      this.checkIfWalletIsConnected();
     // const provider = new providers.Web3Provider(window.ethereum);

    } else if (window.web3) {

      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      window.alert('Non-Ethereum browser detected. You Should consider using MetaMask!');
    }
  }

  async mintDomain() {
    this.checkIfWalletIsConnected()
    this.domain = this.username.value
    this.record = this.tagline.value
    // Don't run if the domain is empty
    if (!this.domain) {
      return
    }
    // Alert the user if the domain is too short
    if (this.domain.length < 0) {
      alert('Domain must be at least 3 characters long');
      return;
    }
    // Calculate price based on length of domain (change this to match your contract)
    // 3 chars = 0.5 MATIC, 4 chars = 0.3 MATIC, 5 or more = 0.1 MATIC
    const price = this.domain.length === 3 ? '0.5' : this.domain.length === 4 ? '0.3' : '0.1';
    console.log("Minting domain", this.domain, "with price", price);
    try {
      const {ethereum} = window;
      const web3 = new Web3(Web3.givenProvider);

      if (ethereum) {
         this.provider = new providers.Web3Provider(window.ethereum);
        console.log('provider: ', this.provider)
        const signer = this.provider.getSigner();
        const contract = new Contract(this.CONTRACT_ADDRESS, this.contractAbiObj.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let tx = await contract['register'](this.domain, {value: utils.parseEther(price)});
        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Check if the transaction was successfully completed
        if (receipt.status === 1) {
          console.log("Domain minted! https://mumbai.polygonscan.com/tx/" + tx.hash);

          // Set the record for the domain
          tx = await contract['setRecord'](this.domain, this.record);
          await tx.wait();

          console.log("Record set! https://mumbai.polygonscan.com/tx/" + tx.hash);

        } else {
          alert("Transaction failed! Please try again");
        }
      } else {
        console.log('nik : no window.ethereum', window)
      }
    } catch (error) {
      console.log(error);
    }
  }

  getErrorMessage() {
    if (this.username.hasError('required') || this.tagline.hasError('required')) {
      return 'You must enter a value';
    }
    return ''
  }

  async checkIfWalletIsConnected() {
   const chainId =  await window.ethereum.request({ method: 'eth_chainId' });
   console.log('network :', chainId)
    if (chainId === this.networkChainId) {
      this.networkIsPolygonMumbai = true;
    } else {
      this.networkIsPolygonMumbai = false;

    }
    this.cdr.detectChanges()



  }

  switchNetwork() {
    window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: this.networkChainId }], // Check networks.js for hexadecimal network ids
    }).then((res: any) => {
      console.log(res)
      this.networkIsPolygonMumbai = true
    });
  }
  async fetchMints(){
    this.checkIfWalletIsConnected();
    if(!this.networkIsPolygonMumbai){
      return
    }
    this.provider = new providers.Web3Provider(window.ethereum);
    console.log('provider: ', this.provider)
    const signer = this.provider.getSigner();
    const contract = new Contract(this.CONTRACT_ADDRESS, this.contractAbiObj.abi, signer);
    const names = await contract['getAllNames']();
    this.names = names;
    console.log(names)
    const mintRecords = await Promise.all(names.map(async (name: any) => {
      const mintRecord = await contract['records'](name);
      const owner = await contract['domains'](name);
      return {
        id: names.indexOf(name),
        name: name,
        record: mintRecord,
        owner: owner,
      };
    }));
    console.log(mintRecords)
    this.names = mintRecords;

  }
}
