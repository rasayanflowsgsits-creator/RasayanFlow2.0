import React, { useRef } from 'react';
import Modal from './ui/Modal';
import { X, Download, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';

export default function StoreRequestReceiptModal({ open, onClose, request, storeManagerName = 'Store Manager' }) {
  const printRef = useRef(null);

  if (!request) return null;

  const requestId = request.id || request._raw?._id || request.requestId || 'REQ-2026-001';
  const requestedBy = request.studentName || request.lab || request.labName || 'Lab Admin';
  const approvedBy = request.approvedByName || request.approvedBy || storeManagerName || 'Store Manager';
  const chemicalName = request.chemicalName || 'Chemical Reagent';
  const quantity = request.quantity || request.quantityRequested || 0;
  const unit = request.unit || 'g';
  const casNumber = request.casNumber || request._raw?.casNumber || 'N/A';
  const receiptNumber = request.receiptNumber || request._raw?.receiptNumber || 'REC-2026-101';
  const requestType = request.requestType || 'Lab Requisition';

  // Format Date and Time
  const dateObj = new Date(request.date || request.approvedAt || request.requestedAt || Date.now());
  const approvalDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const approvalTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Handle PDF Download / Print
  const handleDownloadPDF = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Requisition_Bill_${receiptNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #2e3d19; background: #ffffff; }
            .bill-box { border: 2px solid #5c6e46; padding: 24px; border-radius: 12px; max-width: 650px; margin: 0 auto; }
            .header-title { text-align: center; border-bottom: 2px solid #5c6e46; padding-bottom: 12px; margin-bottom: 20px; }
            .header-title h2 { margin: 0; color: #3c4e23; font-size: 20px; text-transform: uppercase; }
            .header-title p { margin: 4px 0 0 0; color: #71805a; font-size: 12px; font-weight: 600; }
            .table-details { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .table-details tr:nth-child(even) { background-color: #f8faee; }
            .table-details td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #e4eed3; }
            .table-details td.label { font-weight: 700; color: #5c6e46; width: 35%; }
            .table-details td.value { font-weight: 800; color: #2e3d19; }
            .sig-title { font-size: 14px; font-weight: 900; color: #3c4e23; border-bottom: 2px solid #5c6e46; padding-bottom: 4px; margin-bottom: 16px; text-transform: uppercase; }
            .sig-grid { display: flex; justify-content: space-between; gap: 20px; margin-top: 10px; }
            .sig-box { border: 1px solid #cfd8bd; border-radius: 10px; padding: 16px; width: 46%; background: #fffef8; }
            .sig-box h4 { margin: 0 0 12px 0; color: #3c4e23; font-size: 14px; }
            .sig-line { border-bottom: 1px solid #a8be8a; margin: 35px 0 10px 0; position: relative; }
            .sig-text { font-size: 11px; line-height: 1.5; color: #37412a; font-weight: 600; }
            .footer-note { text-align: center; margin-top: 30px; font-size: 11px; color: #71805a; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="bill-box">
            <div class="header-title">
              <h2>SGSITS, INDORE — DEPARTMENT OF PHARMACY</h2>
              <p>RasayanFlow Central Store Requisition Voucher • Receipt #${receiptNumber}</p>
            </div>

            <table class="table-details">
              <tr><td class="label">Request ID</td><td class="value">${requestId}</td></tr>
              <tr><td class="label">Receipt Number</td><td class="value">${receiptNumber}</td></tr>
              <tr><td class="label">Chemical Reagent</td><td class="value">${chemicalName} (CAS: ${casNumber})</td></tr>
              <tr><td class="label">Quantity Issued</td><td class="value">${quantity} ${unit}</td></tr>
              <tr><td class="label">Requisition Type</td><td class="value">${requestType}</td></tr>
              <tr><td class="label">Requested By</td><td class="value">${requestedBy}</td></tr>
              <tr><td class="label">Approved By</td><td class="value">${approvedBy}</td></tr>
              <tr><td class="label">Approval Date</td><td class="value">${approvalDate}</td></tr>
              <tr><td class="label">Approval Time</td><td class="value">${approvalTime}</td></tr>
            </table>

            <div class="sig-title">AUTHORIZED SIGNATURES</div>

            <div class="sig-grid">
              <div class="sig-box">
                <h4>Store Manager</h4>
                <div class="sig-line"></div>
                <div class="sig-text">
                  Name: ${approvedBy}<br/>
                  Designation: Store Manager<br/>
                  SGSITS
                </div>
              </div>
              <div class="sig-box">
                <h4>Lab Assistant</h4>
                <div class="sig-line"></div>
                <div class="sig-text">
                  Name: ${requestedBy}<br/>
                  Designation: Lab In-charge<br/>
                  SGSITS
                </div>
              </div>
            </div>

            <div class="footer-note">
              Generated by RasayanFlow — Chemical Inventory Management System<br/>
              SGSITS, Indore
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal open={open} onClose={onClose} showCloseButton={false} panelClassName="max-w-2xl w-full p-0 overflow-hidden">
      <div className="bg-[#fffef8] dark:bg-[#1a1d16] text-[#37412a] dark:text-[#e4e9d8] p-6 sm:p-8 space-y-6">
        
        {/* Print Printable Container */}
        <div ref={printRef} className="space-y-6">
          
          {/* Institution Header */}
          <div className="text-center pb-3 border-b-2 border-[#5c6e46] dark:border-[#a8be8a]">
            <span className="px-2.5 py-0.5 rounded bg-[#5c6e46] text-white text-[10px] font-black uppercase tracking-wider">
              Official Transfer Bill
            </span>
            <h2 className="text-lg sm:text-xl font-black text-[#2e3d19] dark:text-[#eef4e8] mt-1 uppercase tracking-tight">
              SGSITS, INDORE — DEPARTMENT OF PHARMACY
            </h2>
            <p className="text-xs font-bold text-[#71805a] dark:text-[#a5b48b]">
              RasayanFlow Chemical Requisition & Stock Transfer Voucher
            </p>
          </div>

          {/* Details Table (Matching Screenshot Style) */}
          <div className="rounded-lg border border-[#cfd8bd] dark:border-[#414a33] overflow-hidden">
            <table className="w-full text-left text-xs font-semibold">
              <tbody className="divide-y divide-[#e4eed3] dark:divide-[#2e3722]">
                <tr className="bg-[#f4f6ee] dark:bg-[#20251a]">
                  <td className="p-3 font-bold text-[#5c6e46] dark:text-[#a8be8a] w-1/3">Request ID</td>
                  <td className="p-3 font-mono font-black text-[#2e3d19] dark:text-[#eef4e8]">{requestId}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#5c6e46] dark:text-[#a8be8a]">Requested By</td>
                  <td className="p-3 font-black text-[#2e3d19] dark:text-[#eef4e8]">{requestedBy}</td>
                </tr>
                <tr className="bg-[#f4f6ee] dark:bg-[#20251a]">
                  <td className="p-3 font-bold text-[#5c6e46] dark:text-[#a8be8a]">Approved By</td>
                  <td className="p-3 font-black text-[#2e3d19] dark:text-[#eef4e8]">{approvedBy}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#5c6e46] dark:text-[#a8be8a]">Chemical Reagent</td>
                  <td className="p-3 font-bold text-[#2e3d19] dark:text-[#eef4e8]">
                    {chemicalName} <span className="font-mono text-[#71805a]">(Qty: {quantity} {unit})</span>
                  </td>
                </tr>
                <tr className="bg-[#f4f6ee] dark:bg-[#20251a]">
                  <td className="p-3 font-bold text-[#5c6e46] dark:text-[#a8be8a]">Approval Date</td>
                  <td className="p-3 font-mono font-extrabold text-[#2e3d19] dark:text-[#eef4e8]">{approvalDate}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#5c6e46] dark:text-[#a8be8a]">Approval Time</td>
                  <td className="p-3 font-mono font-extrabold text-[#2e3d19] dark:text-[#eef4e8]">{approvalTime}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AUTHORIZED SIGNATURES Section (Exact Match with Screenshot) */}
          <div className="space-y-3 pt-2">
            <div className="border-b-2 border-[#5c6e46] dark:border-[#a8be8a] pb-1">
              <h3 className="text-sm font-black text-[#3c4e23] dark:text-[#a8be8a] uppercase tracking-wider">
                AUTHORIZED SIGNATURES
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Left Box: Store Manager */}
              <div className="rounded-xl border border-[#cfd8bd] dark:border-[#414a33] bg-[#fffef8] dark:bg-[#20251a] p-4 space-y-3">
                <h4 className="text-sm font-black text-[#3c4e23] dark:text-[#eef4e8]">
                  Store Manager
                </h4>
                
                {/* Signature Line & Graphic */}
                <div className="relative pt-6 pb-1 border-b border-[#a8be8a]">
                  <div className="absolute top-0 left-2 text-[#5c6e46] font-serif italic text-sm font-bold opacity-80 select-none">
                    ✍️ {approvedBy}
                  </div>
                </div>

                <div className="text-xs font-semibold text-[#37412a] dark:text-[#e4e9d8] space-y-0.5">
                  <p>Name: <strong className="font-extrabold">{approvedBy}</strong></p>
                  <p>Designation: Store Manager</p>
                  <p>SGSITS</p>
                </div>
              </div>

              {/* Right Box: Lab Assistant / Requester */}
              <div className="rounded-xl border border-[#cfd8bd] dark:border-[#414a33] bg-[#fffef8] dark:bg-[#20251a] p-4 space-y-3">
                <h4 className="text-sm font-black text-[#3c4e23] dark:text-[#eef4e8]">
                  Lab Assistant
                </h4>
                
                {/* Signature Line & Graphic */}
                <div className="relative pt-6 pb-1 border-b border-[#a8be8a]">
                  <div className="absolute top-0 left-2 text-[#5c6e46] font-serif italic text-sm font-bold opacity-80 select-none">
                    ✍️ {requestedBy}
                  </div>
                </div>

                <div className="text-xs font-semibold text-[#37412a] dark:text-[#e4e9d8] space-y-0.5">
                  <p>Name: <strong className="font-extrabold">{requestedBy}</strong></p>
                  <p>Designation: Lab In-charge</p>
                  <p>SGSITS</p>
                </div>
              </div>

            </div>
          </div>

          {/* Footnote */}
          <div className="text-center pt-3 text-[11px] font-medium text-[#71805a] dark:text-[#a5b48b] italic leading-tight">
            Generated by RasayanFlow — Chemical Inventory Management System<br />
            SGSITS, Indore
          </div>

        </div>

        {/* Action Buttons (Exact Match with Screenshot) */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e4eed3] dark:border-[#2e3722]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold text-[#5c6e46] dark:text-[#a8be8a] hover:bg-[#f4f6ee] transition-all flex items-center gap-1.5"
          >
            <X size={15} />
            <span>Close</span>
          </button>
          
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="px-6 py-2.5 rounded-xl bg-[#475727] hover:bg-[#39471f] text-white text-xs font-black shadow-md transition-all flex items-center gap-2"
          >
            <Download size={15} />
            <span>Download PDF</span>
          </button>
        </div>

      </div>
    </Modal>
  );
}
