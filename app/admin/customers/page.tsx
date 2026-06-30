'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Customer = {
  id: string;
  phone: string;
  name: string;
  balance: number;
  creditLimit: number;
  totalOrders: number;
  totalTransactions: number;
  lastOrderAt: string | null;
};

type CustomerDetail = Customer & {
  orders: { id: string; product: string; quantity: number; total: number; status: string; createdAt: string }[];
  transactions: { id: string; type: string; amount: number; balanceAfter: number; createdAt: string }[];
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    const url = searchTerm
      ? `/api/admin/customers?search=${encodeURIComponent(searchTerm)}`
      : '/api/admin/customers';
    const res = await fetch(url);
    if (res.ok) setCustomers(await res.json());
    setLoading(false);
  }, []);

  const fetchCustomerDetail = async (phone: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/admin/customers?phone=${encodeURIComponent(phone)}`);
    if (res.ok) setSelectedCustomer(await res.json());
    else setSelectedCustomer(null);
    setDetailLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  const formatBalance = (amount: number) => {
    const n = Number(amount);
    return n < 0
      ? `-₦${Math.abs(n).toFixed(2)}`
      : `₦${n.toFixed(2)}`;
  };

  const getBalanceColor = (amount: number) =>
    Number(amount) < 0 ? 'text-red-600' : Number(amount) > 0 ? 'text-orange-600' : 'text-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-orange-600 hover:underline mb-1 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">👥 Customers</h1>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone or name..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); fetchCustomers(); }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <p className="text-gray-500">No customers found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Balance</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700 hidden md:table-cell">Orders</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700 hidden md:table-cell">Last Order</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{c.phone}</td>
                    <td className="px-4 py-3">{c.name}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${getBalanceColor(c.balance)}`}>
                      {formatBalance(c.balance)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">{c.totalOrders}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs hidden md:table-cell">
                      {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => fetchCustomerDetail(c.phone)}
                        className="text-orange-600 hover:text-orange-800 text-xs font-medium underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {detailLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8">Loading...</div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 pt-10 overflow-y-auto" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 my-10" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                <p className="text-sm text-gray-500 font-mono">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Stats Cards */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`rounded-lg border p-3 ${Number(selectedCustomer.balance) < 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                <p className="text-xs text-gray-500">Balance</p>
                <p className={`text-lg font-bold ${getBalanceColor(selectedCustomer.balance)}`}>
                  {formatBalance(selectedCustomer.balance)}
                </p>
              </div>
              <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                <p className="text-xs text-gray-500">Credit Limit</p>
                <p className="text-lg font-bold text-blue-700">₦{Number(selectedCustomer.creditLimit).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-3 bg-purple-50 border-purple-200">
                <p className="text-xs text-gray-500">Total Orders</p>
                <p className="text-lg font-bold text-purple-700">{selectedCustomer.totalOrders}</p>
              </div>
              <div className="rounded-lg border p-3 bg-green-50 border-green-200">
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-lg font-bold text-green-700">{selectedCustomer.totalTransactions}</p>
              </div>
            </div>

            {/* Orders */}
            <div className="px-6 pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Orders</h3>
              {selectedCustomer.orders.length === 0 ? (
                <p className="text-sm text-gray-400">No orders yet.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1.5">Product</th>
                        <th className="text-right px-2 py-1.5">Qty</th>
                        <th className="text-right px-2 py-1.5">Total</th>
                        <th className="text-center px-2 py-1.5">Status</th>
                        <th className="text-right px-2 py-1.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedCustomer.orders.map((o) => (
                        <tr key={o.id}>
                          <td className="px-2 py-1.5">{o.product}</td>
                          <td className="px-2 py-1.5 text-right">{o.quantity}kg</td>
                          <td className="px-2 py-1.5 text-right">₦{Number(o.total).toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              o.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                              o.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Transactions */}
            <div className="px-6 pb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Transactions</h3>
              {selectedCustomer.transactions.length === 0 ? (
                <p className="text-sm text-gray-400">No transactions yet.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1.5">Type</th>
                        <th className="text-right px-2 py-1.5">Amount</th>
                        <th className="text-right px-2 py-1.5">Balance After</th>
                        <th className="text-right px-2 py-1.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedCustomer.transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              t.type === 'SALE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right">₦{Number(t.amount).toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right">₦{Number(t.balanceAfter).toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
