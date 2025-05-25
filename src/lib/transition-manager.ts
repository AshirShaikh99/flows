import { FlowData, FlowNode, NodeTransition, ResponseOption } from '../types';

export interface TransitionContext {
  currentNodeId: string;
  userResponse?: string;
  variables?: Record<string, unknown>;
  conditionResults?: Record<string, boolean>;
}

export class TransitionManager {
  private flowData: FlowData;

  constructor(flowData: FlowData) {
    this.flowData = flowData;
  }

  /**
   * Update the flow data
   */
  updateFlowData(flowData: FlowData) {
    this.flowData = flowData;
  }

  /**
   * Get the next node ID based on the current context
   */
  getNextNodeId(context: TransitionContext): string | null {
    const currentNode = this.getNodeById(context.currentNodeId);
    if (!currentNode) {
      console.warn('Current node not found:', context.currentNodeId);
      return null;
    }

    // Handle different node types
    switch (currentNode.type) {
      case 'workflow':
        return this.handleWorkflowTransitions(currentNode, context);
      
      case 'question':
        return this.handleQuestionTransitions(currentNode, context);
      
      case 'condition':
        return this.handleConditionTransitions(currentNode, context);
      
      case 'start':
      case 'message':
        return this.handleSimpleTransitions(currentNode);
      
      default:
        return null;
    }
  }

  /**
   * Handle transitions for workflow nodes
   */
  private handleWorkflowTransitions(node: FlowNode, context: TransitionContext): string | null {
    const transitions = node.data.transitions || [];
    
    if (transitions.length === 0) {
      // No transitions defined, look for connected edges
      return this.getConnectedNodeId(node.id);
    }

    // Find the appropriate transition based on trigger type
    for (const transition of transitions) {
      if (this.shouldTriggerTransition(transition, context)) {
        return transition.targetNodeId || this.getConnectedNodeId(node.id, transition.id);
      }
    }

    // If no transition matches, use the first one or connected edge
    const firstTransition = transitions[0];
    return firstTransition?.targetNodeId || this.getConnectedNodeId(node.id, firstTransition?.id);
  }

  /**
   * Handle transitions for question nodes
   */
  private handleQuestionTransitions(node: FlowNode, context: TransitionContext): string | null {
    const options = node.data.options || [];
    
    if (!context.userResponse) {
      console.warn('No user response provided for question node');
      return null;
    }

    // Find matching option
    const matchingOption = this.findMatchingOption(options, context.userResponse);
    if (matchingOption) {
      return matchingOption.targetNodeId || this.getConnectedNodeId(node.id, matchingOption.id);
    }

    // If no exact match, use the first option or connected edge
    const firstOption = options[0];
    return firstOption?.targetNodeId || this.getConnectedNodeId(node.id, firstOption?.id);
  }

  /**
   * Handle transitions for condition nodes
   */
  private handleConditionTransitions(node: FlowNode, context: TransitionContext): string | null {
    const condition = node.data.condition;
    if (!condition) {
      console.warn('No condition defined for condition node');
      return this.getConnectedNodeId(node.id);
    }

    // Evaluate the condition
    const conditionResult = this.evaluateCondition(condition, context);
    const handleId = conditionResult ? 'true' : 'false';
    
    return this.getConnectedNodeId(node.id, handleId);
  }

  /**
   * Handle transitions for simple nodes (start, message)
   */
  private handleSimpleTransitions(node: FlowNode): string | null {
    return this.getConnectedNodeId(node.id);
  }

  /**
   * Check if a transition should be triggered
   */
  private shouldTriggerTransition(transition: NodeTransition, context: TransitionContext): boolean {
    switch (transition.triggerType) {
      case 'user_response':
        return Boolean(context.userResponse);
      
      case 'condition_met':
        return this.evaluateTransitionCondition(transition);
      
      case 'manual':
        return true; // Manual transitions are always available
      
      case 'timeout':
        // This would need to be handled by the calling code
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Find matching option based on user response
   */
  private findMatchingOption(options: ResponseOption[], userResponse: string): ResponseOption | null {
    const normalizedResponse = userResponse.toLowerCase().trim();
    
    // First, try exact match
    let match = options.find(option => 
      option.text.toLowerCase().trim() === normalizedResponse
    );
    
    if (match) return match;

    // Then try partial match
    match = options.find(option => 
      option.text.toLowerCase().includes(normalizedResponse) ||
      normalizedResponse.includes(option.text.toLowerCase())
    );
    
    return match || null;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: { operator: string; value: string }, context: TransitionContext): boolean {
    if (!context.userResponse) return false;

    const userResponse = context.userResponse.toLowerCase();
    const conditionValue = condition.value.toLowerCase();

    switch (condition.operator) {
      case 'equals':
        return userResponse === conditionValue;
      
      case 'contains':
        return userResponse.includes(conditionValue);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate transition-specific conditions
   */
  private evaluateTransitionCondition(transition: NodeTransition): boolean {
    if (!transition.condition) return true;
    
    // This could be extended to support more complex condition evaluation
    // For now, just return true if condition exists
    return Boolean(transition.condition);
  }

  /**
   * Get connected node ID from edges
   */
  private getConnectedNodeId(sourceNodeId: string, sourceHandle?: string): string | null {
    const edge = this.flowData.edges.find(edge => 
      edge.source === sourceNodeId && 
      (sourceHandle ? edge.sourceHandle === sourceHandle : true)
    );
    
    return edge?.target || null;
  }

  /**
   * Get node by ID
   */
  private getNodeById(nodeId: string): FlowNode | null {
    return this.flowData.nodes.find(node => node.id === nodeId) || null;
  }

  /**
   * Get all possible next nodes from current node
   */
  getPossibleNextNodes(nodeId: string): FlowNode[] {
    const currentNode = this.getNodeById(nodeId);
    if (!currentNode) return [];

    const nextNodeIds: string[] = [];

    // Get from transitions
    if (currentNode.data.transitions) {
      currentNode.data.transitions.forEach(transition => {
        if (transition.targetNodeId) {
          nextNodeIds.push(transition.targetNodeId);
        }
      });
    }

    // Get from edges
    this.flowData.edges
      .filter(edge => edge.source === nodeId)
      .forEach(edge => {
        if (!nextNodeIds.includes(edge.target)) {
          nextNodeIds.push(edge.target);
        }
      });

    return nextNodeIds
      .map(id => this.getNodeById(id))
      .filter(node => node !== null) as FlowNode[];
  }

  /**
   * Validate flow integrity
   */
  validateFlow(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for orphaned nodes
    const connectedNodeIds = new Set<string>();
    this.flowData.edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    // Add nodes with transitions
    this.flowData.nodes.forEach(node => {
      if (node.data.transitions && node.data.transitions.length > 0) {
        connectedNodeIds.add(node.id);
        node.data.transitions.forEach(transition => {
          if (transition.targetNodeId) {
            connectedNodeIds.add(transition.targetNodeId);
          }
        });
      }
    });

    const orphanedNodes = this.flowData.nodes.filter(node => 
      node.type !== 'start' && !connectedNodeIds.has(node.id)
    );

    if (orphanedNodes.length > 0) {
      errors.push(`Orphaned nodes found: ${orphanedNodes.map(n => n.id).join(', ')}`);
    }

    // Check for missing target nodes
    this.flowData.nodes.forEach(node => {
      if (node.data.transitions) {
        node.data.transitions.forEach(transition => {
          if (transition.targetNodeId && !this.getNodeById(transition.targetNodeId)) {
            errors.push(`Node ${node.id} has transition to non-existent node: ${transition.targetNodeId}`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 