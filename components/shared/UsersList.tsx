
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersList() {
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') {
            fetch("/api/users", {
                headers: { 'X-User-Role': user.role }
            })
                .then((res) => {
                    if (res.ok) return res.json();
                    throw new Error('Unauthorized');
                })
                .then((data) => setUsers(data))
                .catch(err => console.error(err));
        } else {
            setUsers([]); // Clear or keep empty
        }
    }, []);

    const createUser = async () => {
        const name = prompt("Enter name");
        const email = prompt("Enter email");
        if (!name || !email) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        await fetch("/api/users", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role,
                'X-User-Id': String(user.id)
            },
            body: JSON.stringify({ name, email, password: "password", role: "user" }),
        });
        // Refresh list
        fetch("/api/users").then((res) => res.json()).then((data) => setUsers(data));
    };

    // Parent component controls layout, so we can render freely if mounted
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Users
                    {/* Button is already guarded by same logic practically, but keeping for safety */}
                    <button onClick={createUser} className="text-sm bg-blue-500 text-white px-2 py-1 rounded">Add User</button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {users.length === 0 ? (
                    <p>No users found.</p>
                ) : (
                    <ul>
                        {users.map((user) => (
                            <li key={user.id}>{user.name} ({user.email})</li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
