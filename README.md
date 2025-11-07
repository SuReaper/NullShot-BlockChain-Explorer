
### NullShot BlockChain Explorer

This project is an MCP built on NullShot's TypeScript Framework. it's role is to connect Agents/LLMs to RealTime Blockchain data and give them access to the worldwide internet as well as giving detailed technical analysis. Every tool used in this project is absloutely free and decent for personal usage.


## Tools Included:

| Tools             | Description                                                                                     |
|---------------------------|-------------------------------------------------------------------------------------------------|
| **tokenAnalyzer**        | Analyzes tokens based on their technical indicators and provides detailed analysis.           |
| **whaleTracker**         | Tracks large wallet movements and gives a detailed response.                                  |
| **tokenSearchAndInfo**   | Searches for tokens by name and returns basic metadata such as symbol and price.              |
| **tokenSecurityChecker** | Checks whether a token is a scam or legitimate.                                                 |
| **transactionTracker**   | Decrypts a transaction's hash into a human-readable text.                                       |
| **getWalletTokenTransactions** | Checks the latest transactions of a specific wallet.                                    |
| **getWalletTokenBalance** | Checks the token holdings of a wallet address.                                                   |
| **getNFTByWallet**       | Checks the NFTs owned by a wallet.                                                                |
| **getFearAndGreed**       | Retrieves the current Fear and Greed index.                                                        |



## Initialization

To get started, You will need three API Keys for some of the tools. TAAPI_API_KEY, DEXCHECK_API_KEY and MORALIS_API_KEY. Each one of the keys are used for the following tools:

MORALIS_API_KEY: transactionTracker, getWalletTokenTransactions, getWalletTokenBalance and getNFTByWallet.
DEXCHECK_API_KEY: whaleTracker
TAAPI_API_KEY: tokenAnalyzer

Once you set get them, choose if you want to go local or you want to deploy. If it is local, put them inside of a .dev.vars file in the main folder with the following syntax:
```
MORALIS_API_KEY=Insert Your Api Key Here
...
```

For deploying, Put them inside of wrangler.jsonc in the vars section like so:
```
"MORALIS_API_KEY": "Your Api Key Here"
```

Now you need to open up the terminal inside of the workspace folder and type in the following:

**For Local:** (needs a .dev.vars file)
```
npx wrangler dev
```

**For Deploying:** 
```
npx wrangler deploy
```

The whole thing is basically done, but now, you would want to set it up. Here is an example of how it would look like inside of Roo Code:
```
  {"mcpServers": {
    "nullshot-blockchain-explorer": {
      "type": "sse",
      "url": "example.workers.dev/sse",
      "alwaysAllow": [
        "getWalletTokenTransactions",
        "getWalletTokenBalance",
        "transactionTracker",
        "whaleTracker",
        "tokenAnalyzer",
        "tokenSecurityChecker",
        "tokenSearchAndInfo",
        "getFearAndGreed",
        "getNFTByWallet"
      ],
      "timeout": 300
    }
  }
}
```

That's it. Now you can easily use the tool by telling the ai whatever you want! :)