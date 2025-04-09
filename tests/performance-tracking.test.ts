import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Mock admin address
  },
  contracts: {
    'performance-tracking': {
      functions: {
        'report-sales': vi.fn(),
        'report-satisfaction': vi.fn(),
        'calculate-performance-score': vi.fn(),
        'get-performance': vi.fn(),
        'transfer-admin': vi.fn(),
      },
      variables: {
        admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      },
      maps: {
        'monthly-performance': new Map(),
      },
    },
  },
};

// Mock implementation of contract functions
mockClarity.contracts['performance-tracking'].functions['report-sales'].mockImplementation(
    (franchisee, year, month, amount) => {
      const caller = mockClarity.tx.sender;
      const admin = mockClarity.contracts['performance-tracking'].variables.admin;
      
      if (caller !== franchisee && caller !== admin) {
        return { err: 1 };
      }
      
      if (month < 1 || month > 12) {
        return { err: 2 };
      }
      
      const key = `${franchisee}-${year}-${month}`;
      const currentData = mockClarity.contracts['performance-tracking'].maps['monthly-performance'].get(key) || {
        sales: 0,
        'customer-satisfaction': 0,
        'transactions-count': 0,
        'performance-score': 0,
      };
      
      mockClarity.contracts['performance-tracking'].maps['monthly-performance'].set(key, {
        ...currentData,
        sales: currentData.sales + amount,
      });
      
      return { ok: true };
    }
);

mockClarity.contracts['performance-tracking'].functions['report-satisfaction'].mockImplementation(
    (franchisee, year, month, rating, transactions) => {
      const caller = mockClarity.tx.sender;
      const admin = mockClarity.contracts['performance-tracking'].variables.admin;
      
      if (caller !== franchisee && caller !== admin) {
        return { err: 1 };
      }
      
      if (month < 1 || month > 12) {
        return { err: 2 };
      }
      
      if (rating < 1 || rating > 10) {
        return { err: 3 };
      }
      
      const key = `${franchisee}-${year}-${month}`;
      const currentData = mockClarity.contracts['performance-tracking'].maps['monthly-performance'].get(key) || {
        sales: 0,
        'customer-satisfaction': 0,
        'transactions-count': 0,
        'performance-score': 0,
      };
      
      mockClarity.contracts['performance-tracking'].maps['monthly-performance'].set(key, {
        ...currentData,
        'customer-satisfaction': rating,
        'transactions-count': currentData['transactions-count'] + transactions,
      });
      
      return { ok: true };
    }
);

mockClarity.contracts['performance-tracking'].functions['calculate-performance-score'].mockImplementation(
    (franchisee, year, month) => {
      const caller = mockClarity.tx.sender;
      const admin = mockClarity.contracts['performance-tracking'].variables.admin;
      
      if (caller !== admin) {
        return { err: 1 };
      }
      
      if (month < 1 || month > 12) {
        return { err: 2 };
      }
      
      const key = `${franchisee}-${year}-${month}`;
      const currentData = mockClarity.contracts['performance-tracking'].maps['monthly-performance'].get(key) || {
        sales: 0,
        'customer-satisfaction': 0,
        'transactions-count': 0,
        'performance-score': 0,
      };
      
      const salesFactor = Math.floor(currentData.sales / 1000);
      const satisfactionFactor = currentData['customer-satisfaction'] * 10;
      const performanceScore = salesFactor + satisfactionFactor;
      
      mockClarity.contracts['performance-tracking'].maps['monthly-performance'].set(key, {
        ...currentData,
        'performance-score': performanceScore,
      });
      
      return { ok: performanceScore };
    }
);

mockClarity.contracts['performance-tracking'].functions['get-performance'].mockImplementation(
    (franchisee, year, month) => {
      const key = `${franchisee}-${year}-${month}`;
      return mockClarity.contracts['performance-tracking'].maps['monthly-performance'].get(key) || null;
    }
);

describe('Performance Tracking Contract', () => {
  beforeEach(() => {
    // Reset the maps before each test
    mockClarity.contracts['performance-tracking'].maps['monthly-performance'].clear();
    // Reset the mock functions
    vi.clearAllMocks();
  });
  
  it('should allow franchisee to report sales', () => {
    const franchiseeAddress = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    mockClarity.tx.sender = franchiseeAddress;
    
    const result = mockClarity.contracts['performance-tracking'].functions['report-sales'](
        franchiseeAddress, 2023, 6, 5000
    );
    
    expect(result).toEqual({ ok: true });
    
    const key = `${franchiseeAddress}-2023-6`;
    const performanceData = mockClarity.contracts['performance-tracking'].maps['monthly-performance'].get(key);
    expect(performanceData.sales).toBe(5000);
  });
  
  it('should allow franchisee to report customer satisfaction', () => {
    const franchiseeAddress = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    mockClarity.tx.sender = franchiseeAddress;
    
    const result = mockClarity.contracts['performance-tracking'].functions['report-satisfaction'](
        franchiseeAddress, 2023, 6, 8, 100
    );
    
    expect(result).toEqual({ ok: true });
    
    const key = `${franchiseeAddress}-2023-6`;
    const performanceData = mockClarity.contracts['performance-tracking'].maps['monthly-performance'].get(key);
    expect(performanceData['customer-satisfaction']).toBe(8);
    expect(performanceData['transactions-count']).toBe(100);
  });
  
  it('should allow admin to calculate performance score', () => {
    const franchiseeAddress = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    // Set up some data first
    mockClarity.tx.sender = franchiseeAddress;
    mockClarity.contracts['performance-tracking'].functions['report-sales'](
        franchiseeAddress, 2023, 6, 5000
    );
    mockClarity.contracts['performance-tracking'].functions['report-satisfaction'](
        franchiseeAddress, 2023, 6, 8, 100
    );
    
    // Switch to admin
    mockClarity.tx.sender = mockClarity.contracts['performance-tracking'].variables.admin;
    
    const result = mockClarity.contracts['performance-tracking'].functions['calculate-performance-score'](
        franchiseeAddress, 2023, 6
    );
    
    // Expected: (5000/1000) + (8*10) = 5 + 80 = 85
    expect(result).toEqual({ ok: 85 });
    
    const key = `${franchiseeAddress}-2023-6`;
    const performanceData = mockClarity.contracts['performance-tracking'].maps['monthly-performance'].get(key);
    expect(performanceData['performance-score']).toBe(85);
  });
  
  it('should not allow non-admin to calculate performance score', () => {
    const franchiseeAddress = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    mockClarity.tx.sender = franchiseeAddress;
    
    // Set up some data first
    mockClarity.contracts['performance-tracking'].functions['report-sales'](
        franchiseeAddress, 2023, 6, 5000
    );
    
    // Try to calculate performance score as franchisee
    const result = mockClarity.contracts['performance-tracking'].functions['calculate-performance-score'](
        franchiseeAddress, 2023, 6
    );
    
    expect(result).toEqual({ err: 1 });
  });
});
