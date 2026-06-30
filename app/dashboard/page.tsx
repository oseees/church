'use client';

import { useState, useEffect, useCallback } from 'react';

type Product = { id: string; name: string; pricePerKg: number; stock: number };
type Order = { id: string; product: { name: string }; quantity: number; total: number; status: string; createdAt: string };

declare global { interface Window { PaystackPop: any } }

export default function DashboardPage() {
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products');
    if (res.ok) setProducts(await res.json());
  }, []);

  const fetchCustomer = useCallback(async () => {
    if (!phone) return;
    const res = await fetch(`/api/customer?phone=${encodeURIComponent(phone)}`);
    if (res.ok) { const data = await res.json(); setBalance(data.balance); }
    else setBalance(null);
  }, [phone]);

  const fetchOrders = useCallback(async () => {
    if (!phone) return;
    const res = await fetch(`/api/orders?phone=${encodeURIComponent(phone)}`);
    if (res.ok) setOrders(await res.json());
  }, [phone]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchCustomer(); fetchOrders(); }, [fetchCustomer, fetchOrders]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    const res = await fetch('/api/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, productId: selectedProduct, quantity: parseInt(quantity) }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessage(`✅ Order placed! New balance: ₦${data.balance.toFixed(2)}`);
      setBalance(data.balance); fetchOrders(); setQuantity('');
    } else {
      const err = await res.json();
      setMessage(`❌ ${err.error || 'Failed'}`);
    }
    setLoading(false);
  };

  const handlePay = async () => {
    const amount = parseFloat(paymentAmount);
    if (!phone || isNaN(amount) || amount <= 0) return;
    setPayLoading(true); setMessage('');
    const res = await fetch('/api/paystack/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, amount }),
    });
    if (res.ok) {
      const data = await res.json();
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_KEY!,
        email: `${phone.replace(/\D/g, '')}@customer.church`,
        amount: Math.round(amount * 100),
        currency: 'NGN',
        ref: data.reference,
        metadata: { phone },
        onClose: () => { setPayLoading(false); },
        callback: () => {
          setMessage('💳 Payment processing...');
          setTimeout(() => { fetchCustomer(); setPayLoading(false); }, 3000);
        },
      });
      handler.openIframe();
      setPaymentAmount('');
    } else {
      const err = await res.json();
      setMessage(`❌ ${err.error || 'Payment failed'}`);
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🐔 Chicken Sales</h1>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
        {balance !== null && (
          <p className="mt-2 text-lg font-semibold">
            Balance: <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>₦{balance.toFixed(2)}</span>
          </p>
        )}
      </div>

      {balance !== null && balance > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Make Payment</h2>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
            <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} min="0.01" step="0.01"
              placeholder={balance.toFixed(2)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
          </div>
          <button onClick={handlePay} disabled={payLoading || !paymentAmount}
            className="w-full bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {payLoading ? 'Processing...' : 'Pay with Paystack'}
          </button>
        </div>
      )}

      <form onSubmit={handleOrder} className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Place Order</h2>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — ₦{Number(p.pricePerKg).toFixed(0)}/kg ({p.stock} in stock)</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
        </div>
        <button type="submit" disabled={loading || !phone}
          className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {loading ? 'Placing...' : 'Place Order'}
        </button>
        {message && <p className="mt-2 text-sm text-center font-medium text-gray-700">{message}</p>}
      </form>

      {orders.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Orders</h2>
          <div className="space-y-2">
            {orders.slice(0, 10).map((o) => (
              <div key={o.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <div>
                  <p className="font-medium text-gray-900">{o.product.name}</p>
                  <p className="text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₦{Number(o.total).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'Delivered' ? 'bg-green-100 text-green-700' : o.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
