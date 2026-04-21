import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface PDFExportData {
  locationName: string
  finalScore: number
  rationale: string
  weights: {
    wealth: number
    family: number
    education: number
    competition: number
    accessibility: number
  }
  rawScores?: {
    wealth: number
    family: number
    education: number
    competition: number
    accessibility: number
  }
  estimatedFamilies: string
  medianIncome: string
  competition: string
  mapElement?: HTMLElement
  radarElement?: HTMLElement
}

function generateRadarSVG(weights: PDFExportData['weights']): string {
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const radius = 80

  const weightValues = [weights.wealth, weights.family, weights.education, weights.competition, weights.accessibility]
  // Updated to an emerald-focused, cohesive color palette
  const colors = ['#065f46', '#10b981', '#f59e0b', '#ef4444', '#0f766e']

  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`

  // Background circles
  ;[0.25, 0.5, 0.75, 1].forEach(level => {
    const r = radius * level
    const points = Array.from({ length: 5 }).map((_, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      return `${x},${y}`
    }).join(' ')
    svg += `<polygon points="${points}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`
  })

  // Axis lines
  Array.from({ length: 5 }).forEach((_, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`
  })

  // Radar shape (Updated to Emerald)
  const radarPoints = weightValues.map((value, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5
    const x = cx + Math.cos(angle) * radius * value
    const y = cy + Math.sin(angle) * radius * value
    return `${x},${y}`
  }).join(' ')

  // fill: emerald-500 (20% opacity), stroke: emerald-600
  svg += `<polygon points="${radarPoints}" fill="rgba(16, 185, 129, 0.2)" stroke="#059669" stroke-width="2"/>`

  // Data points and lines
  weightValues.forEach((value, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5
    const x = cx + Math.cos(angle) * radius * value
    const y = cy + Math.sin(angle) * radius * value
    const outerX = cx + Math.cos(angle) * radius
    const outerY = cy + Math.sin(angle) * radius

    svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${colors[i]}" stroke-width="2" stroke-linecap="round"/>`
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="${colors[i]}"/>`
    svg += `<circle cx="${outerX}" cy="${outerY}" r="2" fill="${colors[i]}" opacity="0.45"/>`
  })

  svg += '</svg>'
  return svg
}

async function addRadarChartToPDF(pdf: jsPDF, weights: PDFExportData['weights'], x: number, y: number): Promise<void> {
  try {
    const radarSvg = generateRadarSVG(weights)
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    const ctx = canvas.getContext('2d')

    if (ctx) {
      const img = new Image()
      const svgBlob = new Blob([radarSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(svgBlob)

      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
          URL.revokeObjectURL(url)
          resolve()
        }
        img.src = url
      })

      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', x, y, 60, 60)
    }
  } catch (error) {
    console.error('Failed to generate radar chart:', error)
    // Fallback: just add text
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(10)
    pdf.text('Strategy visualization not available', x, y + 30)
  }
}

export async function generateInvestmentBrief(data: PDFExportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  let yPosition = 20

  // Header box (Updated to Emerald Theme)
  pdf.setFillColor(236, 253, 245) // emerald-50
  pdf.rect(10, 10, pageWidth - 20, 50, 'F')
  pdf.setDrawColor(6, 95, 70) // emerald-800 border
  pdf.setLineWidth(1)
  pdf.rect(10, 10, pageWidth - 20, 50)

  // Header with branding
  pdf.setFontSize(28)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(6, 95, 70) // emerald-800 text
  pdf.text('UpCode', pageWidth / 2, yPosition + 5, { align: 'center' })
  yPosition += 8

  pdf.setFontSize(14)
  pdf.setTextColor(100, 116, 139) // slate-500
  pdf.text('Location Intelligence Platform', pageWidth / 2, yPosition + 5, { align: 'center' })
  yPosition += 15

  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(15, 23, 42) // slate-900
  pdf.text('Investment Opportunity Brief', pageWidth / 2, yPosition + 5, { align: 'center' })
  yPosition += 25

  // Location and Score
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.locationName, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Final Score: ${data.finalScore}/100`, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 20

  // Key Metrics Section
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(15, 23, 42)
  pdf.text('Key Metrics', 20, yPosition)
  pdf.setDrawColor(6, 95, 70) // emerald-800 underline
  pdf.setLineWidth(0.5)
  pdf.line(20, yPosition + 2, 80, yPosition + 2)
  yPosition += 10

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  const metrics = [
    `Estimated Families: ${data.estimatedFamilies}`,
    `Median Income: ${data.medianIncome}`,
    `Competition Level: ${data.competition}`
  ]

  metrics.forEach(metric => {
    pdf.text(metric, 25, yPosition)
    yPosition += 6
  })
  yPosition += 15

  // Rationale Section
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Analysis Rationale', 20, yPosition)
  pdf.line(20, yPosition + 2, 90, yPosition + 2)
  yPosition += 10

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  const rationaleLines = pdf.splitTextToSize(data.rationale, pageWidth - 40)
  pdf.text(rationaleLines, 20, yPosition)
  yPosition += rationaleLines.length * 5 + 15

  // Weights Breakdown Section
  if (yPosition > pageHeight - 60) {
    pdf.addPage()
    yPosition = 20
  }

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Strategy Configuration', 20, yPosition)
  pdf.line(20, yPosition + 2, 100, yPosition + 2)
  yPosition += 10

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  const weightLabels = ['Wealth', 'Family', 'Education', 'Competition', 'Accessibility']
  const weightKeys: (keyof typeof data.weights)[] = ['wealth', 'family', 'education', 'competition', 'accessibility']

  weightKeys.forEach((key, index) => {
    const weight = Math.round(data.weights[key] * 100)
    const rawScore = data.rawScores?.[key]
    const contribution = rawScore ? Math.round(weight * rawScore / 100 * 100) / 100 : 'N/A'
    pdf.text(`${weightLabels[index]}: ${weight}% ${rawScore ? `(Score: ${rawScore}/100, Contribution: ${contribution}pts)` : ''}`, 25, yPosition)
    yPosition += 6
  })
  yPosition += 20

  // Add Radar Chart
  if (yPosition < pageHeight - 80) {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Strategy Visualization', 20, yPosition)
    pdf.line(20, yPosition + 2, 105, yPosition + 2)
    yPosition += 10

    await addRadarChartToPDF(pdf, data.weights, 20, yPosition)
    yPosition += 70
  }

  // Capture and add map if available
  if (data.mapElement && yPosition < pageHeight - 80) {
    try {
      const mapCanvas = await html2canvas(data.mapElement, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      const imgData = mapCanvas.toDataURL('image/png')
      const imgWidth = 80
      const imgHeight = (mapCanvas.height * imgWidth) / mapCanvas.width

      if (yPosition + imgHeight > pageHeight - 20) {
        pdf.addPage()
        yPosition = 20
      }

      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Location Overview', 20, yPosition)
      pdf.line(20, yPosition + 2, 85, yPosition + 2)
      yPosition += 8

      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight)
      yPosition += imgHeight + 10
    } catch (error) {
      console.error('Failed to capture map:', error)
    }
  }

  // Footer
  const footerY = pageHeight - 15
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(100, 116, 139) // slate-500
  pdf.text('Generated by UpCode Location Intelligence Platform', pageWidth / 2, footerY, { align: 'center' })
  pdf.text(new Date().toLocaleDateString(), pageWidth / 2, footerY + 5, { align: 'center' })

  // Download the PDF
  pdf.save(`${data.locationName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_score_breakdown.pdf`)
}