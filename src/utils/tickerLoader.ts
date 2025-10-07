// src/utils/tickerLoader.ts

/**
 * Helper function to generate a large, unique list of mock tickers 
 * to simulate the full set of 500+ stocks (e.g., Nifty 500 or broader index).
 */
const generateMockTickers = (count: number): string[] => {
    const prefixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    const suffixes = ['LTD', 'BANK', 'FIN', 'PHARMA', 'TECH', 'CONS', 'IND', 'PETRO', 'GRP', 'CORP'];
    const tickers = new Set<string>();

    // Start with the real ones to ensure the original mock data works
    const baseTickers = [
        'TCS', 'RELIANCE', 'SBIN', 'ICICIBANK', 'HDFCBANK', 
        'INFY', 'ASIANPAINT', 'SUNPHARMA', 'TITAN', 'MARUTI'
    ];
    baseTickers.forEach(t => tickers.add(t));

    // Generate remaining required tickers
    while (tickers.size < count) {
        const p = prefixes[Math.floor(Math.random() * prefixes.length)];
        const s = suffixes[Math.floor(Math.random() * suffixes.length)];
        const uniqueId = Math.floor(100 + Math.random() * 899); 
        const newTicker = `${p}${s.substring(0, 3)}${uniqueId}`;
        
        if (newTicker.length <= 8) { // Keep tickers short and realistic
            tickers.add(newTicker.toUpperCase());
        }
    }
    
    return Array.from(tickers).slice(0, count);
};


/**
 * NOTE: 
 * This is a MOCK function designed to fulfill the 500-stock requirement in the UI. 
 * In a real application, you would need to implement the file reading logic here 
 * to parse 'tickerbse.txt' and 'tickernse.txt' and combine the contents 
 * into a single array of strings.
 */
export const loadTrackedTickers = (): string[] => {
    // -------------------------------------------------------------------------
    //  !!! IMPORTANT: REPLACE THIS MOCK GENERATOR WITH YOUR ACTUAL FILE READING LOGIC !!!
    // -------------------------------------------------------------------------
    const desiredCount = 500;
    return generateMockTickers(desiredCount);
};

export const TRACKED_TICKERS: string[] = loadTrackedTickers();
