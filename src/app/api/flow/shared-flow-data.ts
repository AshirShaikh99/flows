// Shared flow data storage that can be used across multiple API endpoints
const activeFlows: Map<string, any> = new Map();
const callIdMapping: Map<string, string> = new Map(); // Map placeholder IDs to real call IDs

export function storeFlowData(callId: string, flowData: any): void {
  // Store with the real call ID
  activeFlows.set(callId, flowData);
  
  // Enhanced mapping: Store common placeholder values that UltraVox might use
  const placeholders = ['call-1234567890', 'new_call', 'new call', 'current_call'];
  placeholders.forEach(placeholder => {
    activeFlows.set(placeholder, flowData);
    // Create bidirectional mapping between placeholder and real call ID
    callIdMapping.set(placeholder, callId);
    callIdMapping.set(callId, placeholder);
  });
  
  console.log('✅ Stored flow data with keys:', [callId, ...placeholders]);
  console.log('📊 Total active flows:', activeFlows.size);
  console.log('🔗 Call ID mappings created:', Object.fromEntries(callIdMapping));
}

export function getFlowData(callId: string): any | null {
  // Try the exact call ID first
  let flowData = activeFlows.get(callId);
  if (flowData) {
    console.log('✅ Found flow data for exact call ID:', callId);
    return flowData;
  }

  // Try mapped call ID
  const mappedCallId = callIdMapping.get(callId);
  if (mappedCallId) {
    flowData = activeFlows.get(mappedCallId);
    if (flowData) {
      console.log('✅ Found flow data for mapped call ID:', mappedCallId, 'from:', callId);
      return flowData;
    }
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
  console.log('📊 Available call IDs:', Array.from(activeFlows.keys()));
  console.log('📊 Available mappings:', Object.fromEntries(callIdMapping));
  return null;
}

export function getActiveFlowsCount(): number {
  return activeFlows.size;
}

export function registerCallIdMapping(realCallId: string, placeholderCallId: string): void {
  // Create explicit mapping between real and placeholder call IDs
  callIdMapping.set(placeholderCallId, realCallId);
  callIdMapping.set(realCallId, placeholderCallId);
  
  // If flow data exists for either ID, ensure it's available for both
  const flowDataReal = activeFlows.get(realCallId);
  const flowDataPlaceholder = activeFlows.get(placeholderCallId);
  
  if (flowDataReal) {
    activeFlows.set(placeholderCallId, flowDataReal);
    console.log('🔗 Synchronized flow data from real ID to placeholder:', realCallId, '->', placeholderCallId);
  }
  
  if (flowDataPlaceholder) {
    activeFlows.set(realCallId, flowDataPlaceholder);
    console.log('🔗 Synchronized flow data from placeholder to real ID:', placeholderCallId, '->', realCallId);
  }
  
  console.log('✅ Call ID mapping registered:', { realCallId, placeholderCallId });
}

export function getAllCallIds(): string[] {
  return Array.from(activeFlows.keys());
}

export function clearFlowData(callId: string): void {
  // Remove flow data and all mappings for this call ID
  activeFlows.delete(callId);
  
  // Remove from mappings
  const mappedId = callIdMapping.get(callId);
  if (mappedId) {
    activeFlows.delete(mappedId);
    callIdMapping.delete(callId);
    callIdMapping.delete(mappedId);
  }
  
  console.log('🧹 Cleared flow data and mappings for call ID:', callId);
} 