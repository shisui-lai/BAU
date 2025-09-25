// 测试修改Schema Map后的解析结果
console.log('=== 测试修改Schema Map后的解析结果 ===');

// 原始hex数据
const hexData = '9400800100c0000804000c0c0c0c00000000000000000000000000000606060600000000000000000000000000ffffffffffff00000000ff000000ffffffffffff00000000000000000000ffffffffffff00000000000000000000ffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff'.replace(/\s+/g, '');

console.log('原始hex数据:', hexData);
console.log('数据长度:', hexData.length / 2, '字节');

// 解析表头
const buffer = Buffer.from(hexData, 'hex');
let offset = 40; // 跳过表头

// 修改后的Schema映射
const DROPOUT_MAP = { 0: '正常', 1: '掉线' };  // 一级/二级掉线
const CONNECTION_MAP = { 0: '失联', 1: '正常' };  // 失联状态

// 当前代码的故障判断逻辑
function getBrokenwireFaultStatus(label, value, dataType) {
  if (dataType !== 'BROKENWIRE') {
    return value;
  }

  // 失联状态类型：1正常 0失联 - 需要反转逻辑
  const connectionLossFields = [
    'BMU失联状态',
    'BMU-1号动力接插件温度掉线状态', 
    'BMU-2号动力接插件温度掉线状态',
    'AFE通讯失联',
    'AFE.*失联', 
    'BMU.*AFE.*失联'
  ];

  // 采集掉线类型：0正常 1掉线 - 正向逻辑
  const collectionOfflineFields = [
    '电压采集掉线信息',
    '温度采集掉线信息', 
    '电压一级掉线',
    '温度一级掉线',
    '电压二级掉线',
    '温度二级掉线'
  ];

  // 检查是否为失联状态类型
  const isConnectionLoss = connectionLossFields.some(field => label.includes(field));
  if (isConnectionLoss) {
    return !value; // 反转逻辑：false表示失联（故障），true表示正常
  }

  // 检查是否为采集掉线类型
  const isCollectionOffline = collectionOfflineFields.some(field => label.includes(field));
  if (isCollectionOffline) {
    return value; // 正向逻辑：true表示掉线（故障），false表示正常
  }

  // 默认逻辑
  return value;
}

// 当前代码的掉线页面显示逻辑
function getBrokenwireDisplayValue(label, value, originalClass) {
  // 采集掉线类型：0正常 1掉线 - 需要反转逻辑，但统一显示为"失联"
  const collectionOfflineFields = [
    '电压采集状态',
    '温度采集状态', 
    '电压二级掉线',
    '温度二级掉线'
  ];

  // 检查是否为采集掉线类型
  const isCollectionOffline = collectionOfflineFields.some(field =>
    originalClass.includes(field) || label.includes(field)
  );
  if (isCollectionOffline) {
    return value === false ? '正常' : '失联';  // 反转逻辑：0正常 1失联
  }

  // 其他类型：使用原有逻辑（1正常 0失联）
  return value === true ? '正常' : '失联';
}

// 模拟完整的数据处理流程
function analyzeField(bitValue, label, dataClass) {
  const boolValue = Boolean(bitValue);
  
  // 根据数据类型选择Schema映射
  let schemaValue;
  if (label.includes('电压一级掉线') || label.includes('温度一级掉线') || 
      label.includes('电压二级掉线') || label.includes('温度二级掉线')) {
    schemaValue = DROPOUT_MAP[bitValue];
  } else {
    schemaValue = CONNECTION_MAP[bitValue];
  }
  
  const displayValue = getBrokenwireDisplayValue(label, boolValue, dataClass);
  const isFault = getBrokenwireFaultStatus(label, boolValue, 'BROKENWIRE');
  
  return {
    bitValue,
    boolValue,
    schemaValue,
    displayValue,
    isFault
  };
}

console.log('\n=== 关键数据解析 ===');

// 1. BMU失联状态 (0x0000)
console.log('\n1. BMU失联状态 (0x0000)');
const bmuLostReg = buffer.readUInt16LE(offset);
console.log(`寄存器值: 0x${bmuLostReg.toString(16).padStart(4, '0')}`);

for (let i = 0; i < 8; i++) {
  const bitValue = (bmuLostReg >> i) & 1;
  const label = `BMU${i + 1} 失联`;
  const result = analyzeField(bitValue, label, 'BMU失联状态');
  
  console.log(`  ${label}: 位${bitValue} → Schema"${result.schemaValue}" → 显示"${result.displayValue}" → 故障${result.isFault}`);
}
offset += 2;

// 跳过插件温度掉线
offset += 4;

// 跳过预留字段
offset += 4;

// 5. 电压一级掉线 (0x00ff)
console.log('\n5. 电压一级掉线 (0x00ff)');
const voltLv1Reg = buffer.readUInt16LE(offset);
console.log(`寄存器值: 0x${voltLv1Reg.toString(16).padStart(4, '0')}`);

for (let i = 0; i < 8; i++) {
  const bitValue = (voltLv1Reg >> i) & 1;
  const label = `BMU${i + 1} 电压一级掉线`;
  const result = analyzeField(bitValue, label, '电压一级掉线');
  
  console.log(`  ${label}: 位${bitValue} → Schema"${result.schemaValue}" → 显示"${result.displayValue}" → 故障${result.isFault}`);
}
offset += 2;

// 6. 温度一级掉线 (0x0000)
console.log('\n6. 温度一级掉线 (0x0000)');
const tempLv1Reg = buffer.readUInt16LE(offset);
console.log(`寄存器值: 0x${tempLv1Reg.toString(16).padStart(4, '0')}`);

for (let i = 0; i < 8; i++) {
  const bitValue = (tempLv1Reg >> i) & 1;
  const label = `BMU${i + 1} 温度一级掉线`;
  const result = analyzeField(bitValue, label, '温度一级掉线');
  
  console.log(`  ${label}: 位${bitValue} → Schema"${result.schemaValue}" → 显示"${result.displayValue}" → 故障${result.isFault}`);
}
offset += 2;

// 7. 电压二级掉线 (部分解析)
console.log('\n7. 电压二级掉线 (前3个BMU)');

// BMU1 电压二级掉线
console.log('\n--- BMU1 电压二级掉线 ---');
const bmu1VoltReg = buffer.readUInt16LE(offset);
console.log(`寄存器值: 0x${bmu1VoltReg.toString(16).padStart(4, '0')}`);

for (let bit = 0; bit < 12; bit++) {
  const bitValue = (bmu1VoltReg >> bit) & 1;
  const label = `BMU1 Cell${bit + 1} 电压二级掉线`;
  const result = analyzeField(bitValue, label, '电压二级掉线');
  
  if (bit < 8) { // 只显示前8个
    console.log(`  Cell${bit + 1}: 位${bitValue} → Schema"${result.schemaValue}" → 显示"${result.displayValue}" → 故障${result.isFault}`);
  }
}
offset += 2;

// BMU2 电压二级掉线
console.log('\n--- BMU2 电压二级掉线 ---');
const bmu2VoltReg = buffer.readUInt16LE(offset);
console.log(`寄存器值: 0x${bmu2VoltReg.toString(16).padStart(4, '0')}`);

for (let bit = 0; bit < 12; bit++) {
  const bitValue = (bmu2VoltReg >> bit) & 1;
  const label = `BMU2 Cell${bit + 1} 电压二级掉线`;
  const result = analyzeField(bitValue, label, '电压二级掉线');
  
  if (bit < 8) { // 只显示前8个
    console.log(`  Cell${bit + 1}: 位${bitValue} → Schema"${result.schemaValue}" → 显示"${result.displayValue}" → 故障${result.isFault}`);
  }
}
offset += 2;

// BMU3 电压二级掉线
console.log('\n--- BMU3 电压二级掉线 ---');
const bmu3VoltReg = buffer.readUInt16LE(offset);
console.log(`寄存器值: 0x${bmu3VoltReg.toString(16).padStart(4, '0')}`);

for (let bit = 0; bit < 12; bit++) {
  const bitValue = (bmu3VoltReg >> bit) & 1;
  const label = `BMU3 Cell${bit + 1} 电压二级掉线`;
  const result = analyzeField(bitValue, label, '电压二级掉线');
  
  if (bit < 8) { // 只显示前8个
    console.log(`  Cell${bit + 1}: 位${bitValue} → Schema"${result.schemaValue}" → 显示"${result.displayValue}" → 故障${result.isFault}`);
  }
}

console.log('\n=== 修改后的效果分析 ===');
console.log('✅ Schema映射修正:');
console.log('  - 电压一级掉线: 位1 → "掉线" (之前是"正常")');
console.log('  - 电压二级掉线: 位1 → "掉线" (之前是"正常")');
console.log('  - 温度一级掉线: 位0 → "正常" (之前是"失联")');
console.log('  - 温度二级掉线: 位0 → "正常" (之前是"失联")');

console.log('\n❌ 仍然存在的问题:');
console.log('  - 掉线页面显示: 电压二级掉线仍显示为"失联"而非"掉线"');
console.log('  - 需要同时修改掉线页面的显示逻辑');

console.log('\n📊 预期的掉线页面显示:');
console.log('  - BMU1 电压采集状态: "失联" (因为Cell9-12掉线)');
console.log('  - BMU2 电压采集状态: "正常" (所有单体正常)');
console.log('  - BMU3 电压采集状态: "失联" (因为Cell9-12掉线)');

console.log('\n📊 预期的故障页面显示:');
console.log('  - 应该有8条电压二级掉线故障记录');
console.log('  - BMU1 Cell9-12 和 BMU3 Cell9-12');
console.log('  - 电压一级掉线被过滤，不显示');
