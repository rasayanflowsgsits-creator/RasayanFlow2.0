import React, { useEffect, useState } from 'react';
import { FileText, Clock, AlertTriangle, BookOpen } from 'lucide-react';
import useAuthStore from '../store/authStore';
import usePromotionStore from '../store/promotionStore';

export default function StudentSemesterStatusPage() {
    const user = useAuthStore(state => state.user);
    const { getStudentResults, getStudentHistory, resultLoading } = usePromotionStore();

    const [results, setResults] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedSemester, setSelectedSemester] = useState(user?.semester || '1');

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, selectedSemester]);

    const loadData = async () => {
        const res = await getStudentResults(user._id, selectedSemester);
        setResults(res || []);

        // Only need to load history once initially, but no harm loading it if selectedSem changes, though unnecessary.
        const hist = await getStudentHistory(user._id);
        setHistory(hist || []);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pass': return 'bg-green-100 text-green-800 border-green-200';
            case 'fail': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-[#556b2f] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
                <div className="absolute opacity-10 -right-4 -top-8 rotate-12">
                    <AwardIcon className="w-48 h-48" />
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end w-full gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Academic Record</h1>
                        <p className="text-emerald-50 text-sm sm:text-base opacity-90 max-w-lg">
                            View your exam results, check your current semester status, and review past promotion history.
                        </p>
                    </div>
                    <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm self-start sm:self-auto border border-white/30 text-center">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100 opacity-90 mb-0.5">Current Status</div>
                        <div className="font-bold text-lg whitespace-nowrap">Sem {user?.semester} &bull; Year {user?.year}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Results */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#556b2f]" />
                            Exam Results
                        </h3>
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="text-sm font-medium border-gray-200 rounded-lg bg-gray-50 focus:border-[#556b2f] focus:ring-[#556b2f]"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {resultLoading ? (
                            <div className="p-8 text-center text-gray-500">Loading results...</div>
                        ) : results.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                                <BookOpen className="h-10 w-10 text-gray-300 mb-3" />
                                <p className="font-medium">No results found for Semester {selectedSemester}</p>
                                <p className="text-sm text-gray-400 mt-1">If exams have occurred, results may not be published yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subject</th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Marks Obt.</th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Max / Pass</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {results.map((r, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-800 text-sm">{r.subjectId.name}</div>
                                                    <div className="text-xs font-mono text-gray-500">{r.subjectId.code}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                                                    {r.marks}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium text-gray-500">
                                                    {r.maxMarks} / {r.passingMarks}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(r.status)}`}>
                                                        {r.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: History */}
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-[#556b2f]" />
                            Promotion History
                        </h3>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-6">
                        {history.length === 0 ? (
                            <div className="text-center text-sm text-gray-500 py-4">No promotion history recorded yet.</div>
                        ) : (
                            <div className="relative border-l-2 border-gray-100 pl-4 space-y-6 ml-2">
                                {history.map((record, index) => (
                                    <div key={record._id} className="relative">
                                        <div className="absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full bg-white ring-4 ring-white border-2 border-[#556b2f]">
                                            <div className={`h-2.5 w-2.5 rounded-full ${record.decision === 'promoted' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-xs text-gray-400 font-medium">Session: {record.examSession}</div>
                                            <div className="font-bold text-sm text-gray-900">
                                                {record.decision === 'promoted' ? `Promoted to Sem ${record.toSemester}` : `Sem-back in Sem ${record.fromSemester}`}
                                            </div>
                                            <div className="text-xs font-medium text-gray-600 bg-gray-50 self-start px-2 py-1 rounded inline-flex gap-2">
                                                <span>P: <span className="text-green-600">{record.passedSubjects}</span></span>
                                                <span>F: <span className="text-red-600">{record.failedSubjects}</span></span>
                                            </div>
                                            {record.backlogs?.length > 0 && (
                                                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex flex-col gap-1 inline-block">
                                                    <span className="font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Backlogs Recorded:</span>
                                                    <ul className="list-disc pl-4 space-y-0.5">
                                                        {record.backlogs.map(b => (
                                                            <li key={b._id}>{b.code} - {b.name}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

// Just an aesthetic icon
function AwardIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    );
}
