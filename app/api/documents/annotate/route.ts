import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function POST(request: NextRequest) {
  try {
    const { documentId, analysisData } = await request.json()

    if (!documentId || !analysisData) {
      return NextResponse.json(
        { error: 'Document ID and analysis data are required' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createServerClient()

    // Get the original document from storage
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Download the original PDF from storage
    const { data: pdfData, error: storageError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (storageError || !pdfData) {
      return NextResponse.json(
        { error: 'Failed to download document from storage' },
        { status: 500 }
      )
    }

    // Convert blob to array buffer
    const pdfBytes = await pdfData.arrayBuffer()

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Add analysis summary as a comment on the first page
    const summaryText = `LEGAL ANALYSIS SUMMARY
Document: ${document.name}
Analysis Date: ${new Date().toLocaleDateString()}

${analysisData.summary ? `
OVERALL ASSESSMENT: ${analysisData.summary.overall_assessment?.toUpperCase() || 'N/A'}
Document Type: ${analysisData.summary.document_type || 'N/A'}
Purpose: ${analysisData.summary.document_purpose || 'N/A'}
` : ''}

${analysisData.risk_analysis ? `
RISK ANALYSIS:
${analysisData.risk_analysis.risk_summary || 'No risk summary available'}

High Risk Items: ${analysisData.risk_analysis.high_risk_items?.length || 0}
Medium Risk Items: ${analysisData.risk_analysis.medium_risk_items?.length || 0}
Low Risk Items: ${analysisData.risk_analysis.low_risk_items?.length || 0}
` : ''}

${analysisData.recommendations ? `
KEY RECOMMENDATIONS:
${analysisData.recommendations.next_steps?.slice(0, 3).map((step: string) => `• ${step}`).join('\n') || 'No specific recommendations'}
` : ''}

This document has been analyzed by LegalTech AI. Please review all flagged clauses and recommendations before proceeding.`

    // Add the summary as a text annotation
    firstPage.drawText(summaryText, {
      x: 50,
      y: height - 200,
      size: 10,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: width - 100,
    })

    // Add risk level indicators
    if (analysisData.risk_analysis) {
      let yPosition = height - 300
      
      // High risk items
      if (analysisData.risk_analysis.high_risk_items?.length > 0) {
        firstPage.drawText('🔴 HIGH RISK ITEMS:', {
          x: 50,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0.8, 0.2, 0.2),
        })
        yPosition -= 20

        analysisData.risk_analysis.high_risk_items.slice(0, 3).forEach((item: any) => {
          firstPage.drawText(`• ${item.clause}`, {
            x: 70,
            y: yPosition,
            size: 10,
            font: font,
            color: rgb(0.6, 0.1, 0.1),
            maxWidth: width - 120,
          })
          yPosition -= 15
        })
        yPosition -= 10
      }

      // Medium risk items
      if (analysisData.risk_analysis.medium_risk_items?.length > 0) {
        firstPage.drawText('🟡 MEDIUM RISK ITEMS:', {
          x: 50,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0.8, 0.6, 0.2),
        })
        yPosition -= 20

        analysisData.risk_analysis.medium_risk_items.slice(0, 2).forEach((item: any) => {
          firstPage.drawText(`• ${item.clause}`, {
            x: 70,
            y: yPosition,
            size: 10,
            font: font,
            color: rgb(0.6, 0.4, 0.1),
            maxWidth: width - 120,
          })
          yPosition -= 15
        })
        yPosition -= 10
      }

      // Low risk items
      if (analysisData.risk_analysis.low_risk_items?.length > 0) {
        firstPage.drawText('🟢 LOW RISK ITEMS:', {
          x: 50,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0.2, 0.6, 0.2),
        })
        yPosition -= 20

        analysisData.risk_analysis.low_risk_items.slice(0, 2).forEach((item: any) => {
          firstPage.drawText(`• ${item.clause}`, {
            x: 70,
            y: yPosition,
            size: 10,
            font: font,
            color: rgb(0.1, 0.4, 0.1),
            maxWidth: width - 120,
          })
          yPosition -= 15
        })
      }
    }

    // Add footer with analysis info
    firstPage.drawText('Generated by LegalTech AI - Automated Legal Document Analysis', {
      x: 50,
      y: 50,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    firstPage.drawText(`Analysis completed on ${new Date().toLocaleString()}`, {
      x: 50,
      y: 35,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Add detailed annotations to other pages if they exist
    if (pages.length > 1) {
      for (let i = 1; i < pages.length; i++) {
        const page = pages[i]
        const { width: pageWidth, height: pageHeight } = page.getSize()
        
        // Add page number and analysis reference
        page.drawText(`Page ${i + 1} - LegalTech AI Analysis`, {
          x: pageWidth - 200,
          y: 20,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        })
      }
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save()

    // Return the annotated PDF
    return new NextResponse(modifiedPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.name.replace('.pdf', '')}_annotated.pdf"`,
        'Content-Length': modifiedPdfBytes.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating annotated PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate annotated PDF' },
      { status: 500 }
    )
  }
}
