import { useEffect, useMemo, useState } from 'react';
import useDebounce from '../hooks/useDebounce';
import { Boxes, Search, Send, ChevronDown, ChevronUp, ExternalLink, Package } from 'lucide-react';
import useAppStore from '../store/appStore';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export default function StudentStorePage() {
  const { storeItems, fetchStoreItems, requestStoreItem, setToast } = useAppStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [expandedAbstracts, setExpandedAbstracts] = useState({});
  const [requestForm, setRequestForm] = useState({
    quantity: '',
    purpose: '',
    requestNotes: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchStoreItems();
  }, [fetchStoreItems]);

  const categories = useMemo(() => {
    const set = new Set(storeItems.map(i => i.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [storeItems]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    return storeItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = !normalizedSearch || [item.itemName, item.itemCode, item.category, item.subCategory]
        .filter(Boolean)
        .some(val => val.toLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesSearch;
    });
  }, [debouncedSearch, selectedCategory, storeItems]);

  const groupedItems = useMemo(() => {
    const map = {};
    filteredItems.forEach(item => {
      const cat = item.category || 'General';
      if (!map[cat]) map[cat] = { category: cat, items: [] };
      map[cat].items.push(item);
    });
    return Object.values(map).map(group => ({
      ...group,
      items: group.items.sort((a, b) => (a.subCategory || '').localeCompare(b.subCategory || '') || a.itemName.localeCompare(b.itemName))
    }));
  }, [filteredItems]);

  const toggleAbstract = (id) => {
    setExpandedAbstracts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openRequestModal = (item) => {
    setSelectedItem(item);
    setRequestForm({
      quantity: '',
      purpose: '',
      requestNotes: '',
      dueDate: ''
    });
    setRequestOpen(true);
  };

  const submitStoreRequest = async () => {
    if (!selectedItem || !requestForm.quantity || !requestForm.purpose.trim()) return;

    setRequesting(true);
    try {
      await requestStoreItem({
        storeItemId: selectedItem.id || selectedItem._id,
        quantity: Number(requestForm.quantity),
        purpose: requestForm.purpose.trim(),
        requestNotes: requestForm.requestNotes.trim(),
        dueDate: requestForm.dueDate || null,
      });
      setToast({ type: 'success', message: 'Store request submitted for store admin approval.' });
      setRequestOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to submit store request.' });
    } finally {
      setRequesting(false);
    }
  };

  const lowStockCount = useMemo(() => storeItems.filter(item => item.quantity <= 5).length, [storeItems]);

  return (
    <div className='space-y-6 pb-10 animate-in fade-in'>
      {/* Header Banner */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-[#fdfdf7] dark:bg-[#1f2419] p-6 rounded-2xl border border-[#d9e1ca] dark:border-[#414a33]'>
        <div>
          <h2 className='text-2xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2.5'>
            <Boxes className="h-7 w-7 text-[#5c6e46] dark:text-[#a5b48b]" /> Central Store
          </h2>
          <p className='mt-1 text-sm text-[#71805a] dark:text-[#a5b48b]'>
            Browse centrally managed chemical and equipment inventory across all departments
          </p>
        </div>

        {/* Search Bar */}
        <div className='w-full sm:max-w-xs relative'>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#87996c]" />
          <input 
            type="text"
            placeholder="Search store inventory..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-sm text-[#37412a] outline-none focus:border-[#5c6e46] focus:ring-1 focus:ring-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card title='Store Categories' subtitle='Main inventory groups'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6ee] dark:bg-[#20251a]">
              <Boxes size={24} className='text-[#5c6e46] dark:text-[#a5b48b]' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{new Set(storeItems.map((item) => item.category)).size}</p>
          </div>
        </Card>
        <Card title='Tracked Store Items' subtitle='Total centrally managed SKUs'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6ee] dark:bg-[#20251a]">
              <Package size={24} className='text-[#5c6e46] dark:text-[#a5b48b]' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{storeItems.length}</p>
          </div>
        </Card>
        <Card title='Need Refill Soon' subtitle='Items with 5 or fewer left'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
              <Boxes size={24} className='text-amber-600 dark:text-amber-500' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{lowStockCount}</p>
          </div>
        </Card>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              selectedCategory === cat 
                ? 'bg-[#556b2f] text-white shadow-md' 
                : 'bg-[#f4f6ee] text-[#71805a] hover:bg-[#e8ece1] dark:bg-[#20251a] dark:text-[#a5b48b] dark:hover:bg-[#28301f]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Item Groups */}
      {!groupedItems.length ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9e1ca] bg-[#fdfdf7] py-16 text-center dark:border-[#414a33] dark:bg-[#1a1d16]'>
          <Boxes size={32} className="mb-3 text-[#87996c]" />
          <h3 className="mb-1 text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]">No Items Found</h3>
          <p className="max-w-sm text-sm text-[#71805a] dark:text-[#a5b48b]">
            No store items matched your search query or category filter.
          </p>
        </div>
      ) : (
        groupedItems.map((group) => (
          <Card key={group.category} title={group.category} subtitle={`${group.items.length} SKU${group.items.length > 1 ? 's' : ''} available`}>
            <div className='space-y-4'>
              {group.items.map((item) => {
                const itemId = item.id || item._id;
                const isExpanded = Boolean(expandedAbstracts[itemId]);
                const isLowStock = item.quantity <= 5;
                const abstractText = item.abstract || '';

                return (
                  <div key={itemId} className='flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[#d9e1ca] bg-white p-4 hover:border-[#87996c] dark:border-[#414a33] dark:bg-[#20251a] transition-all'>
                    <div className='flex items-start gap-3.5 flex-1 min-w-0'>
                      <div className='rounded-xl bg-[#f4f6ee] p-3 text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#c5d0b5] shrink-0 mt-0.5'>
                        <Boxes size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className='font-bold text-[#37412a] dark:text-[#e4e9d8] text-base'>{item.itemName}</h4>
                          <span className="rounded-md bg-[#f4f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#a5b48b]">
                            {item.subCategory}
                          </span>
                          {item.itemCode && (
                            <span className="text-xs text-[#87996c]">Code: {item.itemCode}</span>
                          )}
                        </div>

                        {item.description && (
                          <p className='mt-1 text-sm text-[#71805a] dark:text-[#a5b48b] line-clamp-2'>{item.description}</p>
                        )}

                        {/* Expandable Abstract */}
                        {abstractText && (
                          <div className='mt-3 rounded-xl border border-[#d9e1ca] bg-[#fdfdf7] p-3 dark:border-[#414a33] dark:bg-[#1a1d16]'>
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleAbstract(itemId)}>
                              <span className='text-xs font-bold uppercase tracking-wider text-[#556b2f] dark:text-[#a5b48b]'>
                                Chemical Information & Abstract
                              </span>
                              <button className="text-[#71805a] dark:text-[#a5b48b] hover:text-[#37412a]">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>

                            <p className={`mt-2 text-xs leading-relaxed text-[#37412a] dark:text-[#e4e9d8] ${!isExpanded && abstractText.length > 250 ? 'line-clamp-2' : ''}`}>
                              {abstractText}
                            </p>

                            {abstractText.length > 250 && (
                              <button 
                                onClick={() => toggleAbstract(itemId)} 
                                className="mt-1 text-[11px] font-semibold text-[#5c6e46] hover:underline dark:text-[#a5b48b]"
                              >
                                {isExpanded ? 'Show less' : 'Show full abstract →'}
                              </button>
                            )}

                            {item.pubmedId && (
                              <div className="mt-2 border-t border-[#e8ece1] pt-2 dark:border-[#2a3121]">
                                <a 
                                  href={`https://pubmed.ncbi.nlm.nih.gov/${item.pubmedId}`} 
                                  target='_blank' 
                                  rel='noopener noreferrer' 
                                  className='inline-flex items-center gap-1 text-xs text-[#5c6e46] hover:underline dark:text-[#a5b48b]'
                                >
                                  <ExternalLink size={12} /> View on PubMed
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        <div className='mt-3'>
                          <Button className='bg-[#5c6e46] hover:bg-[#4a5538] text-white px-4 py-1.5 text-xs rounded-xl font-semibold' onClick={() => openRequestModal(item)}>
                            <Send size={13} className="mr-1.5 inline" /> Request From Store
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Stock & Location Column */}
                    <div className='text-left md:text-right shrink-0 border-t md:border-t-0 border-[#e8ece1] pt-3 md:pt-0 dark:border-[#2a3121]'>
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-2">
                        <div>
                          <p className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]'>
                            {item.quantity} <span className="text-xs font-normal text-[#71805a] dark:text-[#a5b48b]">{item.category === 'Glassware' ? 'units' : item.quantityUnit}</span>
                          </p>
                          <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>{item.storageLocation || 'Store shelf not specified'}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isLowStock
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}>
                          {isLowStock ? 'Limited Stock' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}

      {/* Request Modal */}
      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title={selectedItem ? `Request ${selectedItem.itemName}` : 'Request Store Item'}>
        <div className='space-y-4'>
          <div className='rounded-xl bg-[#f4f6ee] p-3.5 text-sm text-[#5c6e46] dark:bg-[#20251a] dark:text-[#a5b48b] font-medium'>
            Available quantity: <span className="font-bold">{selectedItem?.quantity} {selectedItem?.category === 'Glassware' ? 'units' : selectedItem?.quantityUnit}</span>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <Input 
              label='Quantity requested' 
              type='number' 
              value={requestForm.quantity} 
              onChange={(e) => setRequestForm((state) => ({ ...state, quantity: e.target.value }))} 
              placeholder="e.g. 5"
              required
            />
            <Input 
              label='Unit' 
              value={selectedItem ? (selectedItem.category === 'Glassware' ? 'units' : selectedItem.quantityUnit) : ''} 
              readOnly 
              className='bg-[#f4f6ee] dark:bg-[#20251a]' 
            />
          </div>

          <Input 
            label='Purpose' 
            value={requestForm.purpose} 
            onChange={(e) => setRequestForm((state) => ({ ...state, purpose: e.target.value }))} 
            placeholder='Why do you need this item? (e.g. Analytical Lab Practical)' 
            required
          />

          <Input 
            label='Need until / return by (optional)' 
            type='date' 
            value={requestForm.dueDate} 
            onChange={(e) => setRequestForm((state) => ({ ...state, dueDate: e.target.value }))} 
          />

          <Input 
            label='Additional notes' 
            value={requestForm.requestNotes} 
            onChange={(e) => setRequestForm((state) => ({ ...state, requestNotes: e.target.value }))} 
            placeholder='Class, faculty, urgency, handling notes...' 
          />

          <Button className='w-full bg-[#5c6e46] hover:bg-[#4a5538] text-white py-2.5 font-semibold rounded-xl' onClick={submitStoreRequest} disabled={requesting}>
            {requesting ? 'Submitting...' : 'Send Store Request'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
