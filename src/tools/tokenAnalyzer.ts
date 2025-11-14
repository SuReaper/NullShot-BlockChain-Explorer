import { z } from "zod";
import { env } from "cloudflare:workers";
import { getFearGreed, formatFearGreed } from '../utils.js';

// All the trading pairs binance supports - don't want the AI trying to analyze tokens that don't eist
const SUPPORTED_PAIRS = [
  "ETH/BTC", "LTC/BTC", "BNB/BTC", "NEO/BTC", "BTC/USDT", "ETH/USDT", "LTC/USDT",
  "BNB/USDT", "ADA/USDT", "XRP/USDT", "DOT/USDT", "DOGE/USDT", "SOL/USDT", 
  "MATIC/USDT", "SHIB/USDT", "AVAX/USDT", "LINK/USDT", "ATOM/USDT", "UNI/USDT",
  "LTC/BTC", "ADA/BTC", "XRP/BTC", "DOT/BTC", "LINK/BTC", "BCH/BTC", "ALGO/BTC",
  //  We can add more but it will overwhelm the ai if it's dumb. better add more if needed.
  // 
];

// timeframes that taapi actually supports
const VALID_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "12h", "1d", "1w"];

export function tokenAnalyzer(server: any) {
  server.tool(
    'tokenAnalyzer',
    'Analyzes a cryptocurrency token using technical indicators on Binance. Provides trading signal recommendations based on multiple indicators including RSI, MACD, EMA, Bollinger Bands, and more. This is NOT financial advice - just technical analysis.',
    {
      symbol: z.string().describe('Trading pair symbol in format COIN/MARKET (e.g., BTC/USDT, ETH/USDT). Must be a Binance-supported pair.'),
      interval: z.string().describe('Timeframe for analysis. Valid options: 1m, 5m, 15m, 30m, 1h, 2h, 4h, 12h, 1d, 1w')
    },
    async ({ symbol, interval }: { symbol: string; interval: string }) => {
      const apiKey = env.TAAPI_API_KEY;

      // making sure we have an api key before doing anything
      if (!apiKey) {
        return {
          content: [
            {
              type: "text",
              text: "Error: TAAPI_API_KEY environment variable is not set. Please configure it using: `wrangler secret put TAAPI_API_KEY`"
            }
          ]
        };
      }

      // normalize the symbol to uppercase just in case user types it lowercase
      const normalizedSymbol = symbol.toUpperCase();
      
      // check if the timeframe is legit
      if (!VALID_TIMEFRAMES.includes(interval)) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid timeframe specified: "${interval}"\n\nSupported timeframes: ${VALID_TIMEFRAMES.join(', ')}`
            }
          ]
        };
      }

      // check if this is actually a binance pair we support
      if (!SUPPORTED_PAIRS.includes(normalizedSymbol)) {
        return {
          content: [
            {
              type: "text",
              text: `Warning: "${normalizedSymbol}" may not be available on Binance.\n\nCommon trading pairs include: BTC/USDT, ETH/USDT, SOL/USDT\n\nNote: This analysis tool exclusively supports Binance trading pairs. If you believe this pair exists on Binance, the system will attempt to proceed with the analysis.`
            }
          ]
        };
      }

      // here's where the magic happens - we request a bunch of indicators at once
      // taapi lets us get up to 20 indicators in a single call which is sick
      const requestBody = {
        secret: apiKey,
        construct: {
          exchange: "binance",
          symbol: normalizedSymbol,
          interval: interval,
          indicators: [
            // momentum indicators - help us see if price is overbought/oversold
            { indicator: "rsi", period: 14 },
            { indicator: "stoch" },
            { indicator: "cci", period: 20 },
            { indicator: "mfi", period: 14 },
            
            // trend indicators - show us the direction and strength
            { indicator: "macd" },
            { indicator: "adx", period: 14 },
            { indicator: "ema", period: 20 },
            { indicator: "ema", period: 50, id: "ema_50" },
            { indicator: "ema", period: 200, id: "ema_200" },
            
            // volatility indicators - measure price movement intensity
            { indicator: "bbands", period: 20 },
            { indicator: "atr", period: 14 },
            
            // volume indicators - confirm price movements
            { indicator: "obv" },
            { indicator: "cmf", period: 20 },
            
            // support/resistance
            { indicator: "pivotpoints" },
            
            // price action
            { indicator: "price" }
          ]
        }
      };

      try {
        // Request to taapi
        const response = await fetch('https://api.taapi.io/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Encoding': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`TAAPI API error: ${response.status} ${response.statusText}`);
        }

                const data = await response.json() as {
          data?: Array<{
            id?: string;
            errors?: string[];
            result?: Record<string, unknown>;
          }>;
        };

        // fetch the fear & greed index
        const fng = await getFearGreed();

        // format all the indicator results nicely
        const formattedResults: any = {};
        
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((item) => {
            if (item.errors && item.errors.length > 0) {
              // if an indicator failed, note it but keep going
              formattedResults[item.id || "unknown"] = { error: item.errors[0] };
            } else if (item.result) {
              // round all numeric values to 2 decimals
              const rounded: any = {};
              for (const [key, value] of Object.entries(item.result)) {
                if (typeof value === 'number') {
                  rounded[key] = Math.round(value * 100) / 100;
                } else {
                  rounded[key] = value;
                }
              }
              formattedResults[item.id || "unknown"] = rounded;
            }
          });
        }


        // build a nice summary for the AI to work with
        const summary = {
          symbol: normalizedSymbol,
          timeframe: interval,
          exchange: "binance",
          timestamp: new Date().toISOString(),
          indicators: formattedResults,
          fear_and_greed: fng
        };

        return {
          content: [
            {
              type: "text",
              text: `TECHNICAL ANALYSIS INSTRUCTIONS

Analysis Target: ${normalizedSymbol} on ${interval} timeframe (Binance)

ANALYSIS REQUIREMENTS:
1. Base analysis exclusively on provided indicator data
2. Do not fabricate or assume missing indicator values
3. Acknowledge errors in indicators without speculation
4. Present balanced perspective including both bullish and bearish signals
5. Clearly state this is technical analysis, not financial advice
6. Reference specific numerical values from indicators
7. Apply standard technical analysis methodologies

ANALYSIS FRAMEWORK:
- Trend Direction: Evaluate EMAs, MACD, ADX
- Momentum: Assess RSI, Stochastic, CCI, MFI for overbought/oversold levels
- Volatility: Review Bollinger Bands and ATR
- Volume Confirmation: Examine OBV and CMF
- Market Sentiment: Incorporate Fear & Greed Index context

EXPECTED OUTPUT STRUCTURE:
1. Current Market Condition (bullish/bearish/neutral with confidence assessment)
2. Key Technical Signals (prioritized indicator readings)
3. Potential Entry/Exit Levels (derived from support/resistance analysis)
4. Risk Assessment (volatility-based evaluation)
5. Overall Trading Bias (with disclaimer: not financial advice)

Proceed with analysis of the data below:`
            },
            {
              type: "text",
              text: `\n\nFEAR & GREED INDEX:\n${formatFearGreed(fng)}`
            },
            {
              type: "text",
              text: `\n\nINDICATOR DATA:\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``
            },
            {
              type: "text",
              text: `\n\nSUPPORTED TIMEFRAMES: ${VALID_TIMEFRAMES.join(', ')}\n\nDISCLAIMER: This analysis is derived exclusively from technical indicators and should not be construed as financial advice. Conduct thorough independent research and consider multiple analytical factors before making any trading decisions.`
            }
          ],
          _metadata: summary
        };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving technical indicator data: ${errorMsg}\n\nVerification checklist:\n- Symbol format is correct (format: COIN/USDT, example: BTC/USDT)\n- Timeframe is valid (supported: ${VALID_TIMEFRAMES.join(', ')})\n- Token is listed on Binance exchange`
            }
          ]
        };
      }
    }
  );
}