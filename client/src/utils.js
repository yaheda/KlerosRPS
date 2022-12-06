import Web3 from "web3";
import detectEthereumProvider from '@metamask/detect-provider';

const getWeb3 = () => {
  return new Promise((resolve, reject) => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
    window.addEventListener("load", async () => {
      let provider = await detectEthereumProvider()
      if (provider) {
        await provider.request({ method: 'eth_requestAccounts' });

        try {
          const web3 = new Web3(window.ethereum);
          resolve(web3);
          return;
        } catch (error) {
          reject(error);
        }
      }

      if (typeof window.web3 !== 'undefined') {
        return resolve(new Web3(window.web3.currentProvider));
      }

      resolve(new Web3('http://localhost:7545'));
    });
  });
};

export { getWeb3 };
