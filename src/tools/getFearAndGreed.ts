import { getFearGreed, formatFearGreed } from '../utils.js';

export function getFearAndGreed(server: any) {
  server.tool(
    'getFearAndGreed',
    'Gets the current Crypto Fear & Greed Index, which measures market sentiment on a scale from 0 (Extreme Fear) to 100 (Extreme Greed).',
    {},
    async () => {
      try {
        const fng = await getFearGreed();
        
        return {
          content: [
            {
              type: "text",
              text: formatFearGreed(fng)
            }
          ],
          _metadata: {
            raw_data: fng
          }
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving Fear & Greed Index data: ${errorMsg}`
            }
          ]
        };
      }
    }
  );
}