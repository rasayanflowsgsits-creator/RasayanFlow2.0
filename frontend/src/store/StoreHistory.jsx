import { Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import StoreLayout from './StoreLayout';
import useStoreManagerMock, { formatQuantity } from './storeManagerMock';

function toCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function StoreHistory() {
  const history = useStoreManagerMock((state) => state.history);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history
      .filter((entry) => !query || entry.chemicalName.toLowerCase().includes(query) || entry.lab.toLowerCase().includes(query))
      .map((entry) => ({ ...entry, quantityDisplay: formatQuantity(entry.quantity, entry.unit) }));
  }, [history, search]);

  const exportCsv = () => {
    const lines = [
      ['chemicalName', 'lab', 'quantity', 'unit', 'status'].map(toCsvCell).join(','),
      ...rows.map((entry) => [entry.chemicalName, entry.lab, entry.quantity, entry.unit, entry.status].map(toCsvCell).join(',')),
    ];
    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'store-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StoreLayout
      title='History'
      subtitle='Search and export dummy allotment history.'
      actions={
        <Button variant='outline' onClick={exportCsv} disabled={!rows.length}>
          <Download size={16} /> Export CSV
        </Button>
      }
    >
      <Card title='History Table' subtitle='Search by chemical name or lab name.'>
        <div className='mb-4 max-w-md'>
          <Input label='Search history' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search chemical or lab' />
          <div className='mt-2 flex items-center gap-2 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
            <Search size={14} /> {rows.length} matching row{rows.length === 1 ? '' : 's'}
          </div>
        </div>
        <Table
          headers={[
            { key: 'chemicalName', label: 'Chemical' },
            { key: 'lab', label: 'Lab' },
            { key: 'quantityDisplay', label: 'Quantity' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
        />
      </Card>
    </StoreLayout>
  );
}
