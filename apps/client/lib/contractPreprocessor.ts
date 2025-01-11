// utils/contractPreprocessor.ts
export function preprocessOriginContract(sourceCode: string): string {
  // Extract contract name
  const contractNameMatch = sourceCode.match(/contract\s+(\w+)\s*{/);
  if (!contractNameMatch) {
    throw new Error('Could not find contract declaration');
  }
  const originalName = contractNameMatch[1];

  // Replace contract name with "OriginContract"
  return sourceCode.replace(
    `contract ${originalName}`,
    'contract OriginContract'
  );
}
  
export function preprocessDestinationContract(sourceCode: string): string {
  // Extract contract name and inheritance
  const contractMatch = sourceCode.match(/contract\s+(\w+)(\s+is\s+[^{]+)?{/);
  if (!contractMatch) {
    throw new Error('Could not find contract declaration');
  }

  // Remove the import statement if it exists
  const processedCode = sourceCode.replace(
    /import\s+['"].*?AbstractCallback\.sol['"];?\s*/,
    ''
  );
  
  // Add necessary imports and interfaces
  const abstractCallbackImports = `
interface IPayable {
    // @notice Allows contracts to pay their debts and resume subscriptions.
    receive() external payable;
    // @notice Allows reactive contracts to check their outstanding debt.
    // @param _contract Reactive contract's address.
    function debt(address _contract) external view returns (uint256);
}

interface IPayer {
    // @dev Make sure to check the msg.sender
    function pay(uint256 amount) external;
    receive() external payable;
}

abstract contract AbstractPayer is IPayer {
    IPayable internal vendor;
    constructor() {
    }
    receive() virtual external payable {
    }
    modifier authorizedSenderOnly() {
        require(address(vendor) == address(0) || msg.sender == address(vendor), 'Authorized sender only');
        _;
    }
    function pay(uint256 amount) external authorizedSenderOnly {
        _pay(payable(msg.sender), amount);
    }
    function coverDebt() external {
        uint256 amount = vendor.debt(address(this));
        _pay(payable(vendor), amount);
    }
    function _pay(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, 'Insufficient funds');
        if (amount > 0) {
            (bool success,) = payable(recipient).call{value: amount}(new bytes(0));
            require(success, 'Transfer failed');
        }
    }
}

abstract contract AbstractCallback is AbstractPayer {
    address internal rvm_id;
    constructor(address _callback_sender) {
        rvm_id = msg.sender;
        vendor = IPayable(payable(_callback_sender));
    }
    modifier rvmIdOnly(address _rvm_id) {
        require(rvm_id == address(0) || rvm_id == _rvm_id, 'Authorized RVM ID only');
        _;
    }
}`;

  const originalName = contractMatch[1];
  const inheritance = contractMatch[2] || '';

  // Find the position after SPDX license and pragma statements
  const pragmaEnd = Math.max(
    processedCode.indexOf('pragma solidity') > -1 ? 
      processedCode.indexOf(';', processedCode.indexOf('pragma solidity')) + 1 : 0,
    processedCode.indexOf('SPDX-License') > -1 ?
      processedCode.indexOf('\n', processedCode.indexOf('SPDX-License')) + 1 : 0
  );

  // Combine everything together
  let finalCode = processedCode.slice(0, pragmaEnd) + '\n\n' + 
                 abstractCallbackImports + '\n\n' + 
                 processedCode.slice(pragmaEnd);

  // Replace contract name and inheritance
  finalCode = finalCode.replace(
    `contract ${originalName}${inheritance}`,
    'contract DestinationContract is AbstractCallback'
  );

  return finalCode;
}