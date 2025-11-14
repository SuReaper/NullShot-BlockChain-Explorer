const tokenAddress = "0xF1f4F43191fe903d156b0819E400aA2206Ec998f";
const url = `https://api.dexscreener.com/latest/dex/search?q=${tokenAddress}`;

const response = await fetch(url);
const data = await response.json();

const pair = data.pairs[0];
console.log(JSON.stringify(pair, null, 2)); // full nested object
