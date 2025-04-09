import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Mock admin address
  },
  contracts: {
    'franchisee-verification': {
      functions: {
        'register-franchisee': vi.fn(),
        'verify-franchisee': vi.fn(),
        'revoke-franchisee': vi.fn(),
        'is-verified-franchisee': vi.fn(),
        'transfer-admin': vi.fn(),
      },
      variables: {
        admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      },
      maps: {
        franchisees: new Map(),
      },
    },
  },
};

// Mock implementation of contract functions
mockClarity.contracts['franchisee-verification'].functions['register-franchisee'].mockImplementation(
    (name, businessId) => {
      const caller = mockClarity.tx.sender;
      const franchisees = mockClarity.contracts['franchisee-verification'].maps.franchisees;
      
      if (franchisees.has(caller) && franchisees.get(caller).verified) {
        return { err: 1 };
      }
      
      franchisees.set(caller, {
        verified: false,
        name,
        'business-id': businessId,
        'registration-date': 123456, // Mock block height
      });
      
      return { ok: true };
    }
);

mockClarity.contracts['franchisee-verification'].functions['verify-franchisee'].mockImplementation(
    (franchisee) => {
      const caller = mockClarity.tx.sender;
      const admin = mockClarity.contracts['franchisee-verification'].variables.admin;
      const franchisees = mockClarity.contracts['franchisee-verification'].maps.franchisees;
      
      if (caller !== admin) {
        return { err: 2 };
      }
      
      if (!franchisees.has(franchisee)) {
        return { err: 3 };
      }
      
      const franchiseeData = franchisees.get(franchisee);
      franchisees.set(franchisee, { ...franchiseeData, verified: true });
      
      return { ok: true };
    }
);

mockClarity.contracts['franchisee-verification'].functions['is-verified-franchisee'].mockImplementation(
    (franchisee) => {
      const franchisees = mockClarity.contracts['franchisee-verification'].maps.franchisees;
      return franchisees.has(franchisee) ? franchisees.get(franchisee).verified : false;
    }
);

describe('Franchisee Verification Contract', () => {
  beforeEach(() => {
    // Reset the franchisees map before each test
    mockClarity.contracts['franchisee-verification'].maps.franchisees.clear();
    // Reset the mock functions
    vi.clearAllMocks();
  });
  
  it('should allow a new franchisee to register', () => {
    const result = mockClarity.contracts['franchisee-verification'].functions['register-franchisee'](
        'Test Franchise', 'BIZ12345'
    );
    
    expect(result).toEqual({ ok: true });
    expect(mockClarity.contracts['franchisee-verification'].maps.franchisees.has(mockClarity.tx.sender)).toBe(true);
    expect(mockClarity.contracts['franchisee-verification'].maps.franchisees.get(mockClarity.tx.sender).verified).toBe(false);
  });
  
  it('should not allow a verified franchisee to register again', () => {
    // First register
    mockClarity.contracts['franchisee-verification'].functions['register-franchisee'](
        'Test Franchise', 'BIZ12345'
    );
    
    // Verify the franchisee
    mockClarity.contracts['franchisee-verification'].maps.franchisees.set(
        mockClarity.tx.sender,
        {
          verified: true,
          name: 'Test Franchise',
          'business-id': 'BIZ12345',
          'registration-date': 123456
        }
    );
    
    // Try to register again
    const result = mockClarity.contracts['franchisee-verification'].functions['register-franchisee'](
        'Test Franchise 2', 'BIZ67890'
    );
    
    expect(result).toEqual({ err: 1 });
  });
  
  it('should allow admin to verify a franchisee', () => {
    // Register a franchisee
    mockClarity.contracts['franchisee-verification'].functions['register-franchisee'](
        'Test Franchise', 'BIZ12345'
    );
    
    // Verify the franchisee
    const result = mockClarity.contracts['franchisee-verification'].functions['verify-franchisee'](
        mockClarity.tx.sender
    );
    
    expect(result).toEqual({ ok: true });
    expect(mockClarity.contracts['franchisee-verification'].maps.franchisees.get(mockClarity.tx.sender).verified).toBe(true);
  });
  
  it('should correctly report verification status', () => {
    // Register a franchisee
    mockClarity.contracts['franchisee-verification'].functions['register-franchisee'](
        'Test Franchise', 'BIZ12345'
    );
    
    // Check status before verification
    let status = mockClarity.contracts['franchisee-verification'].functions['is-verified-franchisee'](
        mockClarity.tx.sender
    );
    expect(status).toBe(false);
    
    // Verify the franchisee
    mockClarity.contracts['franchisee-verification'].functions['verify-franchisee'](
        mockClarity.tx.sender
    );
    
    // Check status after verification
    status = mockClarity.contracts['franchisee-verification'].functions['is-verified-franchisee'](
        mockClarity.tx.sender
    );
    expect(status).toBe(true);
  });
});
