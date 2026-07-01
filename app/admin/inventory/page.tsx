'use client';

import { useState, useEffect, useCallback } from 'react';
import { sendWAWithRetry } from '@/lib/notifications';

type AdminProduct = {
  id: string;
  name: string;
  pricePerKg: number;
  stock: number;
};

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // Add product form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setProducts(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleStockChange = (id: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [id]: value }));
  };

  const updateStock = async (id: string) => {
    const rawValue = editValues[id];
    const newStock = parseInt(rawValue, 10);
    if (isNaN(newStock) || newStock < 0) return;

    setUpdating(id);
    setMessage('');

    const res = await fetch(`/api/admin/inventory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock }),
    });

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
      );
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // Low stock alert — fire and forget
      if (newStock < 10) {
        const product = products.find((p) => p.id === id);
        const alertMsg = `⚠️ Low stock alert: ${product?.name || id} has only ${newStock}kg left.`;
        sendWAWithRetry('admin', alertMsg).catch((err) =>
          console.error('Low stock alert failed:', err)
        );
        setMessage(`⚠️ Low stock alert sent for ${product?.name || id}`);
      }
    } else {
      setMessage('❌ Failed to update stock');
    }
    setUpdating(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') updateStock(id);
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newPrice);
    const stock = parseInt(newStock, 10);

    if (!newName.trim()) {
      setMessage('❌ Product name is required.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setMessage('❌ Enter a valid price per kg.');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setMessage('❌ Enter a valid stock quantity.');
      return;
    }

    setAdding(true);
    setMessage('');

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), pricePerKg: price, stock }),
    });

    if (res.ok) {
      const created = await res.json();
      setProducts((prev) => [...prev, created]);
      setNewName('');
      setNewPrice('');
      setNewStock('');
      setShowAddForm(false);
      setMessage('✅ Product added successfully.');
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(`❌ ${err.error || 'Failed to add product.'}`);
    }
    setAdding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
        <p className="text-gray-500">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📦 Inventory</h1>
        <a
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Admin
        </a>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {message}
        </div>
      )}

      {/* Add Product */}
      <div className="mb-4">
        <button
          onClick={() => setShowAddForm((s) => !s)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addProduct} className="bg-white rounded-xl shadow p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Product Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Chicken Wings"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Price per Kg (₦)</label>
            <input
              type="number" min="0" step="0.01" value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Initial Stock (kg)</label>
            <input
              type="number" min="0" step="1" value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit" disabled={adding}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {adding ? 'Adding...' : 'Save Product'}
            </button>
          </div>
        </form>
      )}

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {products.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-xl shadow p-4 ${
              p.stock < 10 ? 'ring-2 ring-red-300 bg-red-50' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">
                  ₦{Number(p.pricePerKg).toFixed(2)}/kg
                </p>
              </div>
              <span
                className={`text-lg font-bold ${
                  p.stock < 10 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {p.stock}kg
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={editValues[p.id] ?? ''}
                onChange={(e) => handleStockChange(p.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, p.id)}
                placeholder={`${p.stock}`}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <button
                onClick={() => updateStock(p.id)}
                disabled={
                  updating === p.id || editValues[p.id] === undefined
                }
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium
                           hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors whitespace-nowrap"
              >
                {updating === p.id ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price/kg</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-gray-50 ${
                    p.stock < 10 ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.name}</span>
                    {p.stock < 10 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Low
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    ₦{Number(p.pricePerKg).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        p.stock < 10 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {p.stock}kg
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        value={editValues[p.id] ?? ''}
                        onChange={(e) => handleStockChange(p.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, p.id)}
                        placeholder={`${p.stock}`}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm
                                   focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <button
                        onClick={() => updateStock(p.id)}
                        disabled={
                          updating === p.id || editValues[p.id] === undefined
                        }
                        className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium
                                   hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors"
                      >
                        {updating === p.id ? '...' : 'Save'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
