'use client';

import { useState } from 'react';

type AdminOrder = {
  id: string;
  customer: { phone: string; name: string };
  product: { name: string };
  quantity: number;
  total: number;
  status: string;
  createdAt: string;
};

export default function AdminOrdersClient({ orders: initialOrders }: { orders: AdminOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const res = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    if (res.ok) setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    setUpdating(null);
  };

  const statusColors: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Confirmed: 'bg-blue-100 text-blue-800',
    Delivered: 'bg-green-100 text-green-800',
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Recent Orders</h2>

      <div className="block md:hidden space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-900">{o.product.name}</p>
                <p className="text-sm text-gray-500">{o.customer.phone}</p>
              </div>
              <span className="font-semibold">₦{Number(o.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Qty: {o.quantity}kg</span>
              <span className="text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-2">
              <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} disabled={updating === o.id}
                className={`text-xs font-medium rounded-full px-3 py-1 border-0 ${statusColors[o.status]} cursor-pointer disabled:opacity-50`}>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-center py-8">No orders yet.</p>}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.id.substring(0, 8)}...</td>
                  <td className="px-4 py-3">{o.customer.phone}</td>
                  <td className="px-4 py-3">{o.product.name}</td>
                  <td className="px-4 py-3">{o.quantity}kg</td>
                  <td className="px-4 py-3 font-medium">₦{Number(o.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} disabled={updating === o.id}
                      className={`text-xs font-medium rounded-full px-3 py-1 border-0 ${statusColors[o.status]} cursor-pointer disabled:opacity-50`}>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && <p className="text-gray-500 text-center py-8">No orders yet.</p>}
      </div>
    </div>
  );
}