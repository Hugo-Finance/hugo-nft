# Hugo core NFT contract
The contract defines core minting logic and NFTs metadata management. By metadata the following things are meant:
attributes, their traits and IPFS CIDs for them.

See this [contract](./contracts/AbstractHugoNFT.sol), to understand NFT interface.

## Testing
### Primarly
1. *development* network is for running unit-tests defined in `tests` folder. Its id is 5777.
2. *testing* network is for manual tests, which are useful when integrating the project
with the other ones. Its id is 6777.
3. Make sure you have `npx` package installed globally.   

## Unit-tests   
All unit-tests are defined in `tests/test_base.js`.
Simply run ganache client:
```
ganache-cli -p 7545 -i 5777 --allowUnlimitedContractSize  --gasLimit 0xFFFFFFFFFFFF
```
Then run tests with the following command:
```
npx truffle test --network=development

# or with events
npx truffle test --network=development --show-events
```

## Manual tests
First, the contract should be migrated (deployed) to the test network. 
For that run ganache client with *testing* network id - 6777:
```
ganache-cli -p 7545 -i 6777 --allowUnlimitedContractSize  --gasLimit 0xFFFFFFFFFFFF
```
Then, run migrations (deploy contract):
```
npx truffle migrate --network=testing
```
Then, run any script that you want from `scripts` folder:
```
# for minting auto-generative NFTs
[deplyer@deployer] npx truffle exec scripts/mint.js --network=testing
Using network 'testing'.

[DEBUG] Interacting with NFT contract at 0xd61914b1d0AA17C53c303208d3D42F094830c285
[DEBUG] Minting for client1 with address 0xF96C43a0A00962D7f7A80423DFAEc06c9E20A138
[DEBUG] 0xF96C43a0A00962D7f7A80423DFAEc06c9E20A138 now owns token ids [ 0 ]

# for minting exclusive NFTs
[deplyer@deployer] npx truffle exec scripts/mintExclusive.js --network=testing
Using network 'testing'.

[DEBUG] Interacting with NFT contract at 0xd61914b1d0AA17C53c303208d3D42F094830c285
[DEBUG] Minting exclusive NFT for client1 with address 0xF96C43a0A00962D7f7A80423DFAEc06c9E20A138
[DEBUG] 0xF96C43a0A00962D7f7A80423DFAEc06c9E20A138 now owns token ids [ 0, 10000 ]
```
If you want to redeploy the contract, simply run:
```
npx truffle migrate --reset --network=testing
# to redeploy only the contract, but not the contract/Mingrations.sol
npx truffle migrate --reset --f 2 --to 2 --network=testing
```
When contract is migrated to *testing* network, you can interact with it manually using
console:
``` 
npx truffle console --network=testing

truffle(testing)> let a = await HugoNFT.deployed();
truffle(testing)> a.getNFT(0)
[
  '0',
  'NFT-1,2,1,3,3-name',
  'NFT-1,2,1,3,3-description',
  [ '1', '2', '1', '3', '3' ],
  '',
  '0',
  tokenId: '0',
  name: 'NFT-1,2,1,3,3-name',
  description: 'NFT-1,2,1,3,3-description',
  seed: [ '1', '2', '1', '3', '3' ],
  cid: '',
  index: '0'
]
truffle(testing)> a.getNFT(10000)
[
  '10000',
  'Exclusive NFT with random name - name3822',
  'Exclusive NFT with random description -description3822',
  [],
  'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR',
  '1',
  tokenId: '10000',
  name: 'Exclusive NFT with random name - name3822',
  description: 'Exclusive NFT with random description -description3822',
  seed: [],
  cid: 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR',
  index: '1'
]
```
