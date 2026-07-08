import React from 'react';
import { X, Download, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import { generateReceiptPDF } from '../utils/pdfGenerator';

const formatCurrency = (val) => `Rs. ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatQty = (val, unit) => `${Number(val || 0).toLocaleString()} ${unit || 'ml'}`;

export default function ReceiptPreviewModal({ isOpen, onClose, requestData, chemicalData, historyData }) {
  if (!isOpen) return null;

  const receiptNo = requestData?.receiptNumber || historyData?.receiptNumber || 'N/A';
  const approvalDate = requestData?.date || historyData?.date || new Date().toISOString();
  const d = new Date(approvalDate);
  const formattedDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const formattedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const baseUnit = historyData?.baseUnit || requestData?.unit || 'ml';

  const valBefore = historyData?.totalValueBefore || 0;
  const valAfter = historyData?.totalValueAfter || 0;
  const diff = valBefore - valAfter;

  const handleDownload = () => {
    generateReceiptPDF(requestData, chemicalData, historyData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        
        {/* Sticky Close Button */}
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-1 text-white hover:bg-white/40">
          <X size={20} />
        </button>

        <div className="overflow-y-auto">
          {/* Header */}
          <div className="bg-[#556b2f] p-6 text-center text-white">
            <h1 className="text-3xl font-bold tracking-wider">SGSITS</h1>
            <h2 className="mt-1 text-lg">Shri G.S. Institute of Technology and Science</h2>
            <p className="mt-1 text-sm italic opacity-90">Chemical Release Certificate</p>
          </div>

          <div className="p-8">
            {/* Receipt Info */}
            <div className="mb-6 flex flex-col items-end text-sm text-gray-700">
              <p><span className="font-semibold">Receipt No:</span> {receiptNo}</p>
              <p><span className="font-semibold">Date:</span> {formattedDate}</p>
              <p><span className="font-semibold">Time:</span> {formattedTime}</p>
            </div>

            {/* Chemical Details */}
            <div className="mb-8">
              <h3 className="mb-3 border-b-2 border-[#556b2f] pb-1 text-lg font-bold text-[#556b2f]">CHEMICAL DETAILS</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="bg-gray-100"><td className="p-2 text-gray-600 w-1/3">Chemical Name</td><td className="p-2 font-semibold">{chemicalData?.['Chemical Name'] || historyData?.chemicalName || requestData?.chemicalName || 'N/A'}</td></tr>
                  <tr><td className="p-2 text-gray-600">Chemical ID</td><td className="p-2 font-semibold">{chemicalData?.['Chemical ID'] || historyData?.chemicalId || requestData?.chemicalId || 'N/A'}</td></tr>
                  <tr className="bg-gray-100"><td className="p-2 text-gray-600">CAS Number</td><td className="p-2 font-semibold">{chemicalData?.['CAS Number'] || 'N/A'}</td></tr>
                  <tr><td className="p-2 text-gray-600">Grade</td><td className="p-2 font-semibold">{chemicalData?.['Grade'] || 'N/A'}</td></tr>
                  <tr className="bg-gray-100"><td className="p-2 text-gray-600">Pack Size</td><td className="p-2 font-semibold">{chemicalData?.['Pack Size'] || 'N/A'}</td></tr>
                  <tr><td className="p-2 text-gray-600">Quantity Released</td><td className="p-2 font-semibold">{formatQty(historyData?.qtyRequestedBase || requestData?.quantity, baseUnit)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Stock Details */}
            <div className="mb-8">
              <h3 className="mb-3 border-b-2 border-[#556b2f] pb-1 text-lg font-bold text-[#556b2f]">STOCK DETAILS</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="bg-gray-100"><td className="p-2 text-gray-600 w-1/3">Stock Before Release</td><td className="p-2 font-semibold">{historyData?.qtyBeforeBase !== undefined ? formatQty(historyData.qtyBeforeBase, baseUnit) : 'N/A'}</td></tr>
                  <tr><td className="p-2 text-gray-600">Stock After Release</td><td className="p-2 font-semibold">{historyData?.qtyAfterBase !== undefined ? formatQty(historyData.qtyAfterBase, baseUnit) : 'N/A'}</td></tr>
                  <tr className="bg-gray-100"><td className="p-2 text-gray-600">Unit Price</td><td className="p-2 font-semibold">{formatCurrency(historyData?.unitPrice || chemicalData?.['Unit Price (INR)'])}</td></tr>
                  <tr><td className="p-2 text-gray-600">Value of Release (Rs.)</td><td className="p-2 font-semibold">{historyData?.qtyBeforeBase !== undefined ? formatCurrency(diff) : 'N/A'}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Request Details */}
            <div className="mb-10">
              <h3 className="mb-3 border-b-2 border-[#556b2f] pb-1 text-lg font-bold text-[#556b2f]">REQUEST DETAILS</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="bg-gray-100"><td className="p-2 text-gray-600 w-1/3">Request ID</td><td className="p-2 font-semibold">{requestData?.id || 'N/A'}</td></tr>
                  <tr><td className="p-2 text-gray-600">Requested By</td><td className="p-2 font-semibold">{requestData?.lab || historyData?.lab || 'N/A'}</td></tr>
                  <tr className="bg-gray-100"><td className="p-2 text-gray-600">Approved By</td><td className="p-2 font-semibold">{historyData?.actionBy || 'Store Manager'}</td></tr>
                  <tr><td className="p-2 text-gray-600">Approval Date</td><td className="p-2 font-semibold">{formattedDate}</td></tr>
                  <tr className="bg-gray-100"><td className="p-2 text-gray-600">Approval Time</td><td className="p-2 font-semibold">{formattedTime}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="mb-12">
              <h3 className="mb-6 border-b-2 border-[#556b2f] pb-1 text-lg font-bold text-[#556b2f]">AUTHORIZED SIGNATURES</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="rounded-lg border border-gray-300 p-4">
                  <p className="font-bold">Store Manager</p>
                  <div className="my-8 border-b border-gray-400"></div>
                  <div className="text-sm">
                    <p>Name: Store Manager</p>
                    <p>Designation: Store Manager</p>
                    <p>SGSITS</p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-300 p-4">
                  <p className="font-bold">Lab Assistant</p>
                  <div className="my-8 border-b border-gray-400"></div>
                  <div className="text-sm">
                    <p>Name: Lab Assistant</p>
                    <p>Designation: Lab In-charge</p>
                    <p>SGSITS</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs italic text-gray-500">
              <p>Generated by RasayanFlow — Chemical Inventory Management System</p>
              <p>SGSITS, Indore</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 border-t bg-gray-50 p-4">
          <Button variant="outline" className="text-gray-600 hover:bg-gray-100" onClick={onClose}>
            <X size={16} className="mr-1" /> Close
          </Button>
          <Button className="bg-[#556b2f] text-white hover:bg-[#3d4d22]" onClick={handleDownload}>
            <Download size={16} className="mr-1" /> Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
