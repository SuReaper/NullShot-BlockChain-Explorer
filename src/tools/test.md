my current code: import { z } from "zod";
import { env } from "cloudflare:workers";
import { Bot } from "grammy"
import { getFearGreed, formatFearGreed } from '../utils.js';

I want you to make a new tool for me for my mcp server run on cloudflare workers. what it would do is be like an agent which checks tokens' prices and details and based on user input, (like the user would say if the token falls 5 percent or gets to a certain price, etc,) the agent would send a message through a grammy telegram bot to user (bot token variable is in env.TGBOT_TOKEN). basically a smart thing which does this USING the dexscreener's public free api. (make sure to put a limit of 10 tokens otherwise we would be ratelimited.) it would use https://api.dexscreener.com
/latest/dex/search for searching the token the user wants or if user gives token address, would use that instead. example const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=text', {
    method: 'GET',
    headers: {
      "Accept": "*/*"
    },
});

const data = await response.json(); 
anyway my whole thing is in ts so remember that. make sure to make the thing a TOOL as visible by the example below. remember to give it a detailed professional prompting for when things happen. make sure to make the llm ask the user for approval for when its about to choose a token for the alerting so it doesnt choose the wrong token. make sure to only give responses to the llm only if the price/whatever hits the thing user wants so no tokens get wasted. make sure to make the comments inside of the code be human like just like below. Make sure to use Hono for the telegram bot just like import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
also here is a bot example: import { Bot } from "grammy";

const bot = new Bot(""); // <-- put your bot token between the "" (https://t.me/BotFather)

// Reply to any message with "Hi there!".
bot.on("message", (ctx) => ctx.reply("Hi there!"));

bot.start();

but ofc it wouldnt be exactly like this above since it will be different. 



my current index.ts:
import { BlockChainMCP } from './src/server';
export { BlockChainMCP };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const sessionIdStr = url.searchParams.get('sessionId')
    const id = sessionIdStr
        ? env.BLOCKCHAIN_MCP.idFromString(sessionIdStr)
        : env.BLOCKCHAIN_MCP.newUniqueId();

    console.log(`Fetching sessionId: ${sessionIdStr} with id: ${id}`);
    
    url.searchParams.set('sessionId', id.toString());

    return env.BLOCKCHAIN_MCP.get(id).fetch(new Request(
        url.toString(),
        request
    ));
  }
};


example code for the tools:
import { z } from "zod";

export function tokenSearchAndInfo(server: any) {
  server.tool(
    'tokenSearchAndInfo',
    'Searches for tokens on DexScreener and returns details about the top 3 results including chain, price, market cap, pair address, and dex URL.',
    {
      searchQuery: z.string().describe('Token name or symbol to search for (e.g., "snail", "BTC", "pepe")')
    },
    async ({ searchQuery }: { searchQuery: string }) => {
      // dexscreener doesn't need an api key which is nice
      const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/search';
      
      // basic fetch config
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      };

      // types from dexscreener response
      interface BaseToken {
        address: string;
        name: string;
        symbol: string;
      }

      interface QuoteToken {
        address: string;
        name: string;
        symbol: string;
      }

      interface TokenPair {
        chainId: string;
        dexId: string;
        url: string;
        pairAddress: string;
        baseToken: BaseToken;
        quoteToken: QuoteToken;
        priceNative: string;
        priceUsd: string;
        fdv?: number;
        marketCap?: number;
        pairCreatedAt?: number;
      }

      interface DexScreenerResponse {
        schemaVersion: string;
        pairs?: TokenPair[];
      }

      // clean format for our output
      interface FormattedTokenInfo {
        chain: string;
        pairAddress: string;
        tokenName: string;
        tokenSymbol: string;
        priceUsd: string;
        marketCap: string;
        dexUrl: string;
        dexName: string;
      }

      // format market cap nicely with K/M/B suffixes
      const formatMarketCap = (marketCap?: number): string => {
        if (!marketCap || marketCap === 0) return 'N/A';
        
        if (marketCap >= 1_000_000_000) {
          return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
        } else if (marketCap >= 1_000_000) {
          return `$${(marketCap / 1_000_000).toFixed(2)}M`;
        } else if (marketCap >= 1_000) {
          return `$${(marketCap / 1_000).toFixed(2)}K`;
        }
        return `$${marketCap.toFixed(2)}`;
      };

      // clean up the pair data into something readable
      const formatPairData = (pair: TokenPair): FormattedTokenInfo => {
        return {
          chain: pair.chainId.toUpperCase(),
          pairAddress: pair.pairAddress,
          tokenName: pair.baseToken.name,
          tokenSymbol: pair.baseToken.symbol,
          priceUsd: `$${parseFloat(pair.priceUsd).toFixed(6)}`,
          marketCap: formatMarketCap(pair.marketCap),
          dexUrl: pair.url,
          dexName: pair.dexId
        };
      };

      try {
        // build the search url
        const searchUrl = `${DEXSCREENER_API}?q=${encodeURIComponent(searchQuery)}`;
        
        const response = await fetch(searchUrl, fetchOptions);
        
        if (!response.ok) {
          return {
            content: [
              {
                type: "text",
                text: `❌ DexScreener API error: ${response.status} ${response.statusText}`
              }
            ]
          };
        }

        const data: DexScreenerResponse = await response.json();

        // no results found
        if (!data.pairs || data.pairs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `🔍 No tokens found for "${searchQuery}". Try a different search term.`
              }
            ]
          };
        }

        // grab top 3 results (or less if there aren't 3)
        const topPairs = data.pairs.slice(0, 3);
        const formattedTokens = topPairs.map(formatPairData);

        // build a nice looking response with all the details
        const responseText = [
          `🔍 Token Search Results for "${searchQuery}"`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `📊 Found ${data.pairs.length} total pairs, showing top ${topPairs.length}`,
          '',
          ...formattedTokens.map((token, index) => {
            return [
              `${index + 1}. ${token.tokenName} (${token.tokenSymbol})`,
              `   ⛓️  Chain: ${token.chain}`,
              `   💵 Price: ${token.priceUsd}`,
              `   📈 Market Cap: ${token.marketCap}`,
              `   🔗 Pair Address: ${token.pairAddress}`,
              `   🌐 DEX: ${token.dexName}`,
              `   🔗 View on DexScreener: ${token.dexUrl}`,
              ''
            ].join('\n');
          })
        ].join('\n');

        return {
          content: [
            {
              type: "text",
              text: "Provide detailed analysis of these token results. Explain the differences between the three tokens, their chains, market caps, and any notable characteristics. Help the user understand which token might be most relevant to their search."
            },
            {
              type: "text",
              text: responseText
            }
          ],
          _metadata: {
            tokens: formattedTokens,
            summary: {
              total_results: data.pairs.length,
              showing: topPairs.length,
              search_query: searchQuery
            }
          }
        };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: "text",
              text: `❌ Error searching tokens: ${errorMsg}`
            }
          ]
        };
      }
    }
  );
}


oh also here is an example in json format for the result of the searching above using the btc keyword:  {
  "searchQuery": "btc"
}

Provide detailed analysis of these token results. Explain the differences between the three tokens, their chains, market caps, and any notable characteristics. Help the user understand which token might be most relevant to their search.

🔍 Token Search Results for "btc"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Found 30 total pairs, showing top 3

Bitcoin (BTC)
⛓️  Chain: OSMOSIS
💵 Price: 
100829.700000
📈
M
a
r
k
e
t
C
a
p
:
100829.700000📈MarketCap:2010.88B
🔗 Pair Address: 1943-factory_osmo1z6r6qdknhgsc0zeracktgpcxf43j6sekq07nw8sxduc9lg0qjjlqfu25e3_alloyed_allBTC-ibc_498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4
🌐 DEX: osmosis
🔗 View on DexScreener: https://dexscreener.com/osmosis/1943-factory_osmo1z6r6qdknhgsc0zeracktgpcxf43j6sekq07nw8sxduc9lg0qjjlqfu25e3_alloyed_allbtc-ibc_498a0751c798a0d9a389aa3691123dada57daa4fe165d5c75894505b876ba6e4

Bitcoin AI (BTC)
⛓️  Chain: BSC
💵 Price: 
0.005463
📈
M
a
r
k
e
t
C
a
p
:
0.005463📈MarketCap:114.43K
🔗 Pair Address: 0xF1f4F43191fe903d156b0819E400aA2206Ec998f
🌐 DEX: pancakeswap
🔗 View on DexScreener: https://dexscreener.com/bsc/0xf1f4f43191fe903d156b0819e400aa2206ec998f

Bitcoin Second Chance (BTC)
⛓️  Chain: BSC
💵 Price: 
0.024620
📈
M
a
r
k
e
t
C
a
p
:
0.024620📈MarketCap:517.11K
🔗 Pair Address: 0xcED7a2B49743b72BA98BF90bE80CFA260E36584D
🌐 DEX: pancakeswap
🔗 View on DexScreener: https://dexscreener.com/bsc/0xced7a2b49743b72ba98bf90be80cfa260e36584d

anyway, here is the thing for getting info on the tokens like in detail: https://api.dexscreener.com/latest/dex/search

where is returns something like: 
const tokenAddress = "0xF1f4F43191fe903d156b0819E400aA2206Ec998f";
const url = `https://api.dexscreener.com/latest/dex/search?q=${tokenAddress}`;

const response = await fetch(url);
const data = await response.json();

const pair = data.pairs[0];
console.log(JSON.stringify(pair, null, 2)); // returns full nested object

make sure to make the webhook be automatically set on deploy so the user's job is easier. 