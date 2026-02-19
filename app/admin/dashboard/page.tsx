'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Trash2, Upload, ShoppingBag, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FullScreenLoader, Loader } from "@/components/ui/loader";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function AdminDashboard() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('users');

    // Data States
    const [usersList, setUsersList] = useState<any[]>([]);
    const [productsList, setProductsList] = useState<any[]>([]);
    const [ordersList, setOrdersList] = useState<any[]>([]);
    const [parkingBookingsList, setParkingBookingsList] = useState<any[]>([]);

    // Form States
    const [newProduct, setNewProduct] = useState({ name: '', description: '', category: '', price: '', stock: '', image: '' });
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, type: 'user' | 'product' | null, id: string | number | null }>({
        isOpen: false,
        type: null,
        id: null
    });

    // Expanded Orders State
    const [expandedOrders, setExpandedOrders] = useState<number[]>([]);

    const toggleOrder = (orderId: number) => {
        setExpandedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'admin') {
            router.push('/profile');
            return;
        }
        setUser(parsedUser);

        // Initial Fetch
        fetchUsers(parsedUser);
        fetchProducts();
        fetchOrders(parsedUser);
        fetchParkingBookings(parsedUser);
    }, [router]);

    const fetchUsers = async (currentUser: any) => {
        try {
            const res = await fetch('/api/users', {
                headers: {
                    'X-User-Role': currentUser.role,
                    'X-User-Id': String(currentUser.id)
                }
            });
            const data = await res.json();
            if (Array.isArray(data)) setUsersList(data);
            else setUsersList([]);
        } catch (e) {
            console.error('Failed to fetch users', e);
            setUsersList([]);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            setProductsList(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch products', e);
        }
    };

    const fetchOrders = async (currentUser: any) => {
        try {
            const res = await fetch('/api/orders', {
                headers: {
                    'X-User-Role': currentUser.role,
                    'X-User-Id': String(currentUser.id)
                }
            });
            const data = await res.json();
            setOrdersList(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch orders', e);
        }
    };

    const fetchParkingBookings = async (currentUser: any) => {
        try {
            const res = await fetch('/api/parking/all-bookings', {
                headers: {
                    'X-User-Role': currentUser.role,
                    'X-User-Id': String(currentUser.id)
                }
            });
            const data = await res.json();
            setParkingBookingsList(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch parking bookings', e);
        }
    };

    const handleDeleteUser = (id: string) => {
        setDeleteConfirmation({ isOpen: true, type: 'user', id });
    };

    const confirmDelete = async () => {
        const { type, id } = deleteConfirmation;
        if (!type || !id) return;

        setDeleteConfirmation({ isOpen: false, type: null, id: null });

        if (type === 'user') {
            setUsersList(usersList.filter(u => u.id !== id));
            try {
                const res = await fetch(`/api/users/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-User-Role': user.role, 'X-User-Id': String(user.id) }
                });
                if (!res.ok) {
                    fetchUsers(user);
                    toast.error('Failed to delete user');
                } else {
                    toast.success('User deleted successfully');
                }
            } catch (e) {
                fetchUsers(user);
                toast.error('Error deleting user');
            }
        } else if (type === 'product') {
            try {
                const res = await fetch(`/api/products/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-User-Id': String(user.id) }
                });
                if (res.ok) {
                    fetchProducts();
                    toast.success('Product deleted successfully');
                } else {
                    const data = await res.json();
                    toast.error(data.error || 'Failed to delete product');
                }
            } catch (e) {
                toast.error('Error deleting product');
            }
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify(newUser)
            });
            if (res.ok) {
                fetchUsers(user);
                setNewUser({ name: '', email: '', password: '', role: 'user' });
                toast.success('User created successfully');
            } else {
                toast.error('Failed to create user');
            }
        } catch (err) {
            toast.error('Error creating user');
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();

        const productData = editingProduct || newProduct;

        if (!productData.name || !productData.price) {
            toast.error('Name and Price are required');
            return;
        }

        const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
        const method = editingProduct ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify(productData)
            });

            const data = await res.json();

            if (res.ok) {
                setNewProduct({ name: '', description: '', category: '', price: '', stock: '', image: '' });
                setEditingProduct(null);
                fetchProducts();
                toast.success(`Product ${editingProduct ? 'updated' : 'created'} successfully!`);
            } else {
                toast.error(data.error || `Failed to ${editingProduct ? 'update' : 'create'} product`);
            }
        } catch (e) {
            console.error(e);
            toast.error(`Error ${editingProduct ? 'updating' : 'creating'} product`);
        }
    };

    const handleEditProduct = (product: any) => {
        setEditingProduct(product);
        setNewProduct({
            name: product.name,
            description: product.description,
            category: product.category || '',
            price: product.price,
            stock: product.stock,
            image: product.image || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
        setNewProduct({ name: '', description: '', category: '', price: '', stock: '', image: '' });
    };

    const handleDeleteProduct = (id: number) => {
        setDeleteConfirmation({ isOpen: true, type: 'product', id });
    };

    const handleImportBigBasket = async () => {
        if (!importUrl) {
            toast.error('Please enter a BigBasket URL');
            return;
        }

        setIsImporting(true);
        const toastId = toast.loading('Importing from BigBasket...');

        try {
            const res = await fetch('/api/admin/import-bigbasket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({ url: importUrl })
            });

            const data = await res.json();

            if (res.ok) {
                const message = data.count
                    ? `Successfully imported ${data.count} products!`
                    : 'Product imported successfully!';
                toast.success(message, { id: toastId });
                setImportUrl('');
                fetchProducts();
            } else {
                toast.error(data.error || 'Failed to import product', { id: toastId });
            }
        } catch (e) {
            toast.error('Error during import', { id: toastId });
        } finally {
            setIsImporting(false);
        }
    };

    const handleStatusChange = async (orderId: number, newStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                // Optimistic update or refetch
                setOrdersList(ordersList.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
                toast.success('Status updated');
                // Optionally verify with fetch
                // fetchOrders(user); 
            } else {
                toast.error('Failed to update status');
                fetchOrders(user); // Revert on failure
            }
        } catch (e) {
            console.error('Error updating status:', e);
            toast.error('Error updating status');
            fetchOrders(user);
        }
    };

    if (!user) return <FullScreenLoader />;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading('Uploading image...');

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                if (editingProduct) {
                    setEditingProduct({ ...editingProduct, image: data.url });
                } else {
                    setNewProduct({ ...newProduct, image: data.url });
                }
                toast.success('Image uploaded successfully', { id: toastId });
            } else {
                toast.error('Upload failed', { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error('Upload error', { id: toastId });
        }
    };

    return (
        <div className="container mx-auto py-5">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-6 border-b mb-6 relative">
                {['users', 'products', 'orders'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 px-1 relative capitalize font-medium transition-colors 
                            ${activeTab === tab ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add User Form */}
                    <div className="md:col-span-1 bg-white p-6 rounded-lg shadow h-fit">
                        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <Input
                                    type="text"
                                    placeholder="Full Name"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <Input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    autoComplete="new-password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <Select
                                    value={newUser.role}
                                    onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleCreateUser} className="w-full bg-green-600 hover:bg-green-700 h-9 sm:h-10 text-sm sm:text-base">
                                Create User
                            </Button>
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="md:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col">
                        <div className="overflow-auto max-h-[calc(100vh-200px)]">
                            {/* Desktop View */}
                            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {usersList.map((u) => (
                                        <tr key={u.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{u.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{u.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="text-red-600 hover:text-red-900 ml-4"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile View */}
                            <div className="md:hidden space-y-4 p-4">
                                {usersList.map((u) => (
                                    <div key={u.id} className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium text-gray-900">{u.name}</h3>
                                                <p className="text-xs text-gray-500">ID: #{u.id}</p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 break-all flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-400 uppercase">Email:</span>
                                            {u.email}
                                        </div>
                                        <div className="flex justify-end pt-3 border-t">
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="text-red-600 hover:text-red-700 text-sm flex items-center font-medium bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4 mr-1.5" /> Delete User
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {usersList.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Products Tab */}
            {
                activeTab === 'products' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column: Import and Manual Form */}
                        <div className="md:col-span-1 space-y-6">
                            {/* Import Section */}
                            {!editingProduct && (
                                <div className="bg-white p-6 rounded-lg shadow border border-indigo-50">
                                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                        <ShoppingBag className="w-5 h-5 text-indigo-600" />
                                        Quick Import
                                    </h2>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Paste a BigBasket URL to automatically fill product details.
                                    </p>
                                    <div className="space-y-3">
                                        <Input
                                            placeholder="BigBasket Product URL"
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                            className="text-sm"
                                        />
                                        <Button
                                            onClick={handleImportBigBasket}
                                            disabled={isImporting}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import from BigBasket'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Add/Edit Product Form */}
                            <div className="bg-white rounded-lg shadow h-fit overflow-hidden max-h-[calc(100vh-200px)] flex flex-col sticky top-24">
                                <div className="p-6 pb-0 overflow-y-auto">
                                    <h2 className="text-xl font-semibold mb-4">
                                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <Input
                                                placeholder="Product Name"
                                                value={editingProduct ? editingProduct.name : newProduct.name}
                                                onChange={(e) => editingProduct
                                                    ? setEditingProduct({ ...editingProduct, name: e.target.value })
                                                    : setNewProduct({ ...newProduct, name: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <Textarea
                                                placeholder="Description"
                                                value={editingProduct ? editingProduct.description : newProduct.description}
                                                onChange={(e) => editingProduct
                                                    ? setEditingProduct({ ...editingProduct, description: e.target.value })
                                                    : setNewProduct({ ...newProduct, description: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                            <Input
                                                placeholder="Category (e.g. Fruits & Vegetables)"
                                                value={editingProduct ? editingProduct.category : newProduct.category}
                                                onChange={(e) => editingProduct
                                                    ? setEditingProduct({ ...editingProduct, category: e.target.value })
                                                    : setNewProduct({ ...newProduct, category: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={editingProduct ? editingProduct.price : newProduct.price}
                                                    onChange={(e) => editingProduct
                                                        ? setEditingProduct({ ...editingProduct, price: e.target.value })
                                                        : setNewProduct({ ...newProduct, price: e.target.value })
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={editingProduct ? editingProduct.stock : newProduct.stock}
                                                    onChange={(e) => editingProduct
                                                        ? setEditingProduct({ ...editingProduct, stock: e.target.value })
                                                        : setNewProduct({ ...newProduct, stock: e.target.value })
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                                            <div className="space-y-2">
                                                {/* Image Preview */}
                                                {(editingProduct?.image || newProduct.image) && (
                                                    <div className="relative h-40 w-full mb-2 bg-gray-100 rounded-md overflow-hidden border">
                                                        <img
                                                            src={editingProduct ? editingProduct.image : newProduct.image}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-full h-9 sm:h-10 text-sm sm:text-base"
                                                    >
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        {editingProduct?.image || newProduct.image ? 'Change Image' : 'Upload Image'}
                                                    </Button>
                                                    <Input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500">Upload an image for the product.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 pt-4 bg-white border-t mt-auto">
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSaveProduct}
                                            className="flex-1 h-9 sm:h-10 text-sm sm:text-base bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all duration-200"
                                        >
                                            {editingProduct ? 'Update Product' : 'Create Product'}
                                        </Button>
                                        {editingProduct && (
                                            <Button
                                                onClick={() => {
                                                    setEditingProduct(null);
                                                    setNewProduct({ name: '', description: '', category: '', price: '', stock: '', image: '' });
                                                }}
                                                variant="outline"
                                                className="h-9 sm:h-10 text-sm sm:text-base"
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Right Column: Products List */}
                        <div className="md:col-span-2 space-y-4">
                            {/* Category Filter for Admin */}
                            <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                                {["All", ...Array.from(new Set(productsList.map(p => p.category).filter(Boolean)))].map((cat: any) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all border
                                        ${selectedCategory === cat
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col">
                                <div className="overflow-auto max-h-[calc(100vh-200px)]">
                                    {/* Desktop View */}
                                    <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {productsList
                                                .filter(p => selectedCategory === "All" || p.category === selectedCategory)
                                                .map((p) => (
                                                    <tr key={p.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="h-10 w-10 flex-shrink-0">
                                                                <img className="h-10 w-10 rounded-full object-cover" src={p.image || "/placeholder.svg"} alt="" />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {p.name}
                                                            <p className="text-xs text-gray-500 font-normal truncate max-w-xs">{p.description}</p>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                                                            {p.category || 'Uncategorized'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.price}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.stock}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                            <Button
                                                                onClick={() => handleEditProduct(p)}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                                                                title="Edit Product"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDeleteProduct(p.id)}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-600 hover:text-red-900 hover:bg-red-50"
                                                                title="Delete Product"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            {productsList.filter(p => selectedCategory === "All" || p.category === selectedCategory).length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No products found in this category</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Mobile View */}
                                    <div className="md:hidden space-y-4 p-4">
                                        {productsList
                                            .filter(p => selectedCategory === "All" || p.category === selectedCategory)
                                            .map((p) => (
                                                <div key={p.id} className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex gap-3">
                                                            <div className="h-12 w-12 flex-shrink-0">
                                                                <img className="h-12 w-12 rounded-lg object-cover" src={p.image || "/placeholder.svg"} alt="" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-medium text-gray-900">{p.name}</h3>
                                                                {p.category && (
                                                                    <span className="inline-block mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                                                                        {p.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-gray-900">${p.price}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">Stock: {p.stock}</div>
                                                        </div>
                                                    </div>
                                                    {p.description && (
                                                        <p className="text-sm text-gray-500 line-clamp-2">{p.description}</p>
                                                    )}
                                                    <div className="flex justify-end pt-3 border-t gap-3 mt-2">
                                                        <Button
                                                            onClick={() => handleEditProduct(p)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-8"
                                                        >
                                                            <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleDeleteProduct(p.id)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        {productsList.filter(p => selectedCategory === "All" || p.category === selectedCategory).length === 0 && (
                                            <div className="text-center py-8 text-gray-500 text-sm">No products found in this category</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                )
            }


            {/* Orders Tab */}
            {
                activeTab === 'orders' && (
                    <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col">
                        <div className="overflow-auto max-h-[calc(100vh-200px)]">
                            {/* Desktop View */}
                            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10"></th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {ordersList.map((order) => (
                                        <React.Fragment key={order.id}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <button
                                                        onClick={() => toggleOrder(order.id)}
                                                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                                    >
                                                        {expandedOrders.includes(order.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.user?.name || 'Unknown'} (ID: {order.userId})</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.total}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <Select
                                                        value={order.status}
                                                        onValueChange={(val) => handleStatusChange(order.id, val)}
                                                    >
                                                        <SelectTrigger className={`w-[110px] h-8 text-xs font-medium border-0 focus:ring-0 focus:ring-offset-0
                                                    ${order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                                order.status === 'dispatched' ? 'bg-purple-100 text-purple-800' :
                                                                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                                        'bg-gray-100 text-gray-800'}`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="processing">Processing</SelectItem>
                                                            <SelectItem value="dispatched">Dispatched</SelectItem>
                                                            <SelectItem value="delivered">Delivered</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            </tr>
                                            {expandedOrders.includes(order.id) && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={6} className="px-6 py-4">
                                                        <div className="text-sm">
                                                            <h4 className="font-semibold mb-2">Order Items ({order.items?.length || 0})</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {order.items?.map((item: any) => (
                                                                    <div key={item.id} className="flex gap-3 bg-white p-3 rounded border">
                                                                        <div className="h-12 w-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                                                            <img src={item.product?.image || '/placeholder.svg'} alt={item.product?.name} className="h-full w-full object-cover" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-medium text-gray-900">{item.product?.name || 'Product Deleted'}</p>
                                                                            <p className="text-xs text-gray-500">Qty: {item.quantity} x ${item.price}</p>
                                                                            <p className="text-sm font-semibold text-gray-700">Total: ${(item.quantity * item.price).toFixed(2)}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {ordersList.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No orders found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Mobile View */}
                            <div className="md:hidden space-y-4 p-4">
                                {ordersList.map((order) => (
                                    <div key={order.id} className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start cursor-pointer" onClick={() => toggleOrder(order.id)}>
                                            <div className="flex items-center gap-2">
                                                <div className="text-gray-400">
                                                    {expandedOrders.includes(order.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">Order #{order.id}</h3>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="font-bold text-gray-900">${order.total}</div>
                                        </div>

                                        {expandedOrders.includes(order.id) && (
                                            <div className="pt-3 border-t bg-gray-50 -mx-4 px-4 pb-3 space-y-3">
                                                <h4 className="text-xs font-semibold uppercase text-gray-500 mt-2">Order Items</h4>
                                                {order.items?.map((item: any) => (
                                                    <div key={item.id} className="flex gap-3 bg-white p-2 rounded border">
                                                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                                            <img src={item.product?.image || '/placeholder.svg'} alt={item.product?.name} className="h-full w-full object-cover" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.product?.name || 'Product Deleted'}</p>
                                                            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                                                <span>Qty: {item.quantity}</span>
                                                                <span>${(item.quantity * item.price).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="text-sm text-gray-600">
                                            <span className="text-xs font-medium text-gray-400 uppercase mr-2">User:</span>
                                            {order.user?.name || 'Unknown'} <span className="text-xs text-gray-400">(ID: {order.userId})</span>
                                        </div>
                                        <div className="pt-3 border-t">
                                            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Status</label>
                                            <Select
                                                value={order.status}
                                                onValueChange={(val) => handleStatusChange(order.id, val)}
                                            >
                                                <SelectTrigger className={`w-full h-9 text-sm font-medium border-gray-200
                                                    ${order.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        order.status === 'dispatched' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                            order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                'bg-gray-50 text-gray-700'}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="processing">Processing</SelectItem>
                                                    <SelectItem value="dispatched">Dispatched</SelectItem>
                                                    <SelectItem value="delivered">Delivered</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                                {ordersList.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-sm">No orders found</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the {deleteConfirmation.type} and remove it from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
