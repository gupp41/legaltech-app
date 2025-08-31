export interface StructuredAnalysis {
  summary: {
    document_purpose: string
    document_type: string
    key_obligations: string[]
    overall_assessment: 'low_risk' | 'medium_risk' | 'high_risk'
  }
  
  risk_analysis: {
    high_risk_items: RiskItem[]
    medium_risk_items: RiskItem[]
    low_risk_items: RiskItem[]
    risk_summary: string
  }
  
  identified_clauses: {
    key_terms: ClauseItem[]
    conditions: ClauseItem[]
    obligations: ClauseItem[]
    rights: ClauseItem[]
  }
  
  missing_clauses: {
    recommended_additions: string[]
    industry_standards: string[]
    compliance_gaps: string[]
  }
  
  compliance_considerations: {
    regulatory_requirements: string[]
    industry_standards: string[]
    potential_violations: string[]
    compliance_score: 'compliant' | 'needs_review' | 'non_compliant'
  }
  
  recommendations: {
    negotiation_points: string[]
    improvements: string[]
    red_flags: string[]
    next_steps: string[]
  }
  
  technical_details: {
    contract_value?: string
    duration?: string
    parties_involved: string[]
    governing_law?: string
    jurisdiction?: string
  }
}

export interface RiskItem {
  clause: string
  risk_level: 'high' | 'medium' | 'low'
  description: string
  impact: string
  recommendation: string
}

export interface ClauseItem {
  name: string
  description: string
  importance: 'critical' | 'important' | 'standard'
  implications: string
  page_reference?: string
}

export interface AnalysisMetadata {
  model: string
  provider: string
  tokens_used: number
  analysis_timestamp: string
  document_analyzed: string
}
