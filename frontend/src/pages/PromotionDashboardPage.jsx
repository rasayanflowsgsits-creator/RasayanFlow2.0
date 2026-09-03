import React, { useState } from 'react';
import { Award, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import usePromotionStore from '../store/promotionStore';

export default function PromotionDashboardPage() {
    const { evaluateBatch, applyPromotions, resultLoading } = usePromotionStore();

    const [filterCourse, setFilterCourse] = useState('B.Pharm');
    const [filterSemester, setFilterSemester] = useState('1');
    const [examSession, setExamSession] = useState('2026-Jan');

    const [evaluations, setEvaluations] = useState([]);
    const [hasEvaluated, setHasEvaluated] = useState(false);

    const handleEvaluate = async () => {
        const data = await evaluateBatch({
            course: filterCourse,
            semester: filterSemester,
            examSession
        });
        if (data) {
            setEvaluations(data);
            setHasEvaluated(true);
        }
    };

    const handleApply = async () => {
        if (!confirm('Are you sure you want to apply these promotions? This will update the semester for all listed students.')) {
            return;
        }

        const decisions = evaluations.map(e => ({
            studentId: e.studentId,
            decision: e.decision
        }));

        const data = await applyPromotions({ decisions, examSession });
        if (data) {
            alert('Promotions applied successfully!');
            setHasEvaluated(false);
            setEvaluations([]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3c4e23] flex items-center gap-2">
                        <Award className="h-6 w-6 text-[#71805a]" />
                        Promotion Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Evaluate and apply semester promotions (sem-back threshold: &gt; 50% fails)</p>
                </div>
                {hasEvaluated && evaluations.length > 0 && (
                    <button
                        onClick={handleApply}
                        disabled={resultLoading}
                        className="flex items-center gap-2 bg-[#556b2f] hover:bg-[#435525] text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-70"
                    >
                        {resultLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Apply Promotions
                    </button>
                )}
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-5 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Course</label>
                    <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="form-select bg-gray-50 border-gray-200 text-sm rounded-lg py-2 focus:border-[#556b2f] focus:ring-[#556b2f]">
                        <option value="B.Pharm">B.Pharm</option>
                        <option value="M.Pharm">M.Pharm</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Semester</label>
                    <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="form-select bg-gray-50 border-gray-200 text-sm rounded-lg py-2 focus:border-[#556b2f] focus:ring-[#556b2f]">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Exam Session</label>
                    <input type="text" value={examSession} onChange={(e) => setExamSession(e.target.value)} placeholder="e.g. 2026-Jan" className="form-input bg-gray-50 border-gray-200 text-sm rounded-lg py-2 focus:border-[#556b2f] focus:ring-[#556b2f]" />
                </div>
                <button
                    onClick={handleEvaluate}
                    disabled={resultLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors ml-auto shadow-sm"
                >
                    {resultLoading && !hasEvaluated ? 'Evaluating...' : 'Evaluate Cohort'}
                </button>
            </div>

            {hasEvaluated && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {evaluations.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No students found to evaluate for this cohort.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-[#fcfdfa]">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Roll No.</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Passed</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Failed / Missing</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Decision</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {evaluations.map((ev) => (
                                        <tr key={ev.studentId} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{ev.studentName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{ev.rollNumber || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600">{ev.passedSubjects}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-red-600">{ev.failedSubjects}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{ev.totalSubjects}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {ev.decision === 'promoted' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                                                        <CheckCircle className="h-4 w-4" /> Promoted
                                                    </span>
                                                ) : ev.decision === 'sem-back' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                                                        <XCircle className="h-4 w-4" /> Sem-Back
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-bold">
                                                        <AlertCircle className="h-4 w-4" /> Pending
                                                    </span>
                                                )}
                                                {ev.backlogs.length > 0 && ev.decision === 'promoted' && (
                                                    <div className="text-[10px] text-gray-500 mt-1">Carries {ev.backlogs.length} backlogs</div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
