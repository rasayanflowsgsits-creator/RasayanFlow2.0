import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReceiptPDF = (requestData, chemicalData, historyData) => {
  const doc = new jsPDF();

  const primaryColor = [85, 107, 47]; // #556b2f Dark olive green
  const lightGrey = [240, 240, 240];

  // -----------------------------------------------------
  // 1. HEADER SECTION
  // -----------------------------------------------------
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F'); // A4 width is 210mm

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('SGSITS', 105, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('Shri G.S. Institute of Technology and Science', 105, 24, { align: 'center' });
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.text('Chemical Release Certificate', 105, 32, { align: 'center' });

  // -----------------------------------------------------
  // 2. RECEIPT INFO (Right Aligned)
  // -----------------------------------------------------
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const receiptNo = requestData.receiptNumber || historyData?.receiptNumber || 'N/A';
  const approvalDate = requestData.date || historyData?.date || new Date().toISOString();
  const d = new Date(approvalDate);
  const formattedDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const formattedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  doc.text(`Receipt No: ${receiptNo}`, 195, 50, { align: 'right' });
  doc.text(`Date: ${formattedDate}`, 195, 56, { align: 'right' });
  doc.text(`Time: ${formattedTime}`, 195, 62, { align: 'right' });

  let yPos = 65;

  // Helper to format currency (Using Rs. instead of ₹ to prevent font encoding issues)
  const formatCurrency = (val) => `Rs. ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatQty = (val, unit) => `${Number(val || 0).toLocaleString()} ${unit || 'ml'}`;

  // -----------------------------------------------------
  // 3. CHEMICAL DETAILS SECTION
  // -----------------------------------------------------
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CHEMICAL DETAILS', 14, yPos);
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(14, yPos + 2, 80, yPos + 2);
  
  const chemicalTableData = [
    ['Chemical Name', chemicalData?.['Chemical Name'] || historyData?.chemicalName || requestData?.chemicalName || 'N/A'],
    ['Chemical ID', chemicalData?.['Chemical ID'] || historyData?.chemicalId || requestData?.chemicalId || 'N/A'],
    ['CAS Number', chemicalData?.['CAS Number'] || 'N/A'],
    ['Grade', chemicalData?.['Grade'] || 'N/A'],
    ['Pack Size', chemicalData?.['Pack Size'] || 'N/A'],
    ['Quantity Released', formatQty(historyData?.qtyRequestedBase || requestData.quantity, historyData?.baseUnit || requestData.unit)]
  ];

  autoTable(doc, {
    startY: yPos + 4,
    body: chemicalTableData,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'normal', textColor: [100, 100, 100], cellWidth: 50 },
      1: { fontStyle: 'bold', textColor: [0, 0, 0] }
    },
    alternateRowStyles: { fillColor: lightGrey },
    margin: { left: 14, right: 14 }
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // -----------------------------------------------------
  // 4. STOCK DETAILS SECTION
  // -----------------------------------------------------
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('STOCK DETAILS', 14, yPos);
  doc.line(14, yPos + 2, 70, yPos + 2);

  const baseUnit = historyData?.baseUnit || 'ml';
  const stockTableData = [
    ['Stock Before Release', formatQty(historyData?.qtyBeforeBase, baseUnit)],
    ['Stock After Release', formatQty(historyData?.qtyAfterBase, baseUnit)],
    ['Unit Price', formatCurrency(historyData?.unitPrice || chemicalData?.['Unit Price (INR)'])],
    ['Value of Release', formatCurrency((historyData?.qtyBeforeBase - historyData?.qtyAfterBase) * (historyData?.unitPrice || chemicalData?.['Unit Price (INR)'] || 0))]
  ];

  // If we don't have perfect history data (e.g. legacy data), we can fallback safely.
  if (!historyData || historyData.qtyBeforeBase === undefined) {
      stockTableData[0][1] = 'N/A';
      stockTableData[1][1] = 'N/A';
      stockTableData[3][1] = 'N/A';
  } else {
      const valBefore = historyData.totalValueBefore || 0;
      const valAfter = historyData.totalValueAfter || 0;
      stockTableData[3][1] = formatCurrency(valBefore - valAfter);
  }

  autoTable(doc, {
    startY: yPos + 4,
    body: stockTableData,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'normal', textColor: [100, 100, 100], cellWidth: 50 },
      1: { fontStyle: 'bold', textColor: [0, 0, 0] }
    },
    alternateRowStyles: { fillColor: lightGrey },
    margin: { left: 14, right: 14 }
  });

  yPos = doc.lastAutoTable.finalY + 8;

  // -----------------------------------------------------
  // 5. REQUEST DETAILS SECTION
  // -----------------------------------------------------
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('REQUEST DETAILS', 14, yPos);
  doc.line(14, yPos + 2, 75, yPos + 2);

  const requestTableData = [
    ['Request ID', requestData.id || 'N/A'],
    ['Requested By', requestData.lab || historyData?.lab || 'N/A'],
    ['Approved By', historyData?.actionBy || 'Store Manager'],
    ['Approval Date', formattedDate],
    ['Approval Time', formattedTime]
  ];

  autoTable(doc, {
    startY: yPos + 4,
    body: requestTableData,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'normal', textColor: [100, 100, 100], cellWidth: 50 },
      1: { fontStyle: 'bold', textColor: [0, 0, 0] }
    },
    alternateRowStyles: { fillColor: lightGrey },
    margin: { left: 14, right: 14 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // -----------------------------------------------------
  // 6. SIGNATURE SECTION
  // -----------------------------------------------------
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('AUTHORIZED SIGNATURES', 14, yPos);
  doc.line(14, yPos + 2, 85, yPos + 2);

  yPos += 8;

  // Left Box - Store Manager
  doc.setDrawColor(200, 200, 200);
  doc.rect(14, yPos, 80, 35); // x, y, width, height
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Store Manager', 20, yPos + 6);
  doc.line(20, yPos + 18, 88, yPos + 18); // signature line
  doc.setFont('helvetica', 'normal');
  doc.text('Name: Store Manager', 20, yPos + 23);
  doc.text('Designation: Store Manager', 20, yPos + 28);
  doc.text('SGSITS', 20, yPos + 33);

  // Right Box - Lab Assistant
  doc.rect(116, yPos, 80, 35);
  doc.setFont('helvetica', 'bold');
  doc.text('Lab Assistant', 122, yPos + 6);
  doc.line(122, yPos + 18, 190, yPos + 18);
  doc.setFont('helvetica', 'normal');
  doc.text('Name: Lab Assistant', 122, yPos + 23);
  doc.text('Designation: Lab In-charge', 122, yPos + 28);
  doc.text('SGSITS', 122, yPos + 33);

  // -----------------------------------------------------
  // 7. FOOTER
  // -----------------------------------------------------
  const pageHeight = doc.internal.pageSize.height;
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('This is an officially generated document by RasayanFlow — Chemical Inventory Management System', 105, pageHeight - 15, { align: 'center' });
  doc.text('SGSITS, Indore', 105, pageHeight - 10, { align: 'center' });
  doc.text('Page 1 of 1', 195, pageHeight - 10, { align: 'right' });

  // -----------------------------------------------------
  // 8. SAVE
  // -----------------------------------------------------
  const safeFileName = `SGSITS_Chemical_Receipt_${receiptNo}.pdf`;
  doc.save(safeFileName);
};
