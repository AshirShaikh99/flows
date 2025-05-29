// Shared flow data storage that can be used across multiple API endpoints
const activeFlows: Map<string, any> = new Map();

export function storeFlowData(callId: string, flowData: any): void {
  // Store with the real call ID
  activeFlows.set(callId, flowData);
  
  // Also store with common placeholder values that UltraVox might use
  const placeholders = ['call-1234567890', 'new_call', 'new call', 'current_call'];
  placeholders.forEach(placeholder => {
    activeFlows.set(placeholder, flowData);
  });
  
  console.log('✅ Stored flow data with keys:', [callId, ...placeholders]);
  console.log('📊 Total active flows:', activeFlows.size);
}

export function getFlowData(callId: string): any | null {
  // Try the exact call ID first
  let flowData = activeFlows.get(callId);
  if (flowData) {
    console.log('✅ Found flow data for exact call ID:', callId);
    return flowData;
  }

  // Try common placeholder values
  const placeholders = ['call-1234567890', 'new_call', 'new call', 'current_call'];
  for (const placeholder of placeholders) {
    flowData = activeFlows.get(placeholder);
    if (flowData) {
      console.log('✅ Found flow data for placeholder:', placeholder);
      return flowData;
    }
  }

  console.log('❌ No flow data found for call ID:', callId);
  return null;
}

export function getActiveFlowsCount(): number {
  return activeFlows.size;
} 