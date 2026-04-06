import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usersApi, UserResponse } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export function AdminPage() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate("/app/tests");
      return;
    }
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await usersApi.listUsers();
        setUsers(data);
      } catch (e: any) {
        setError(e?.message ?? "Не удалось загрузить пользователей");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [isAdmin, navigate]);

  const handleRoleChange = async (targetUser: UserResponse, newRole: string) => {
    if (targetUser.id === user?.id && newRole !== "admin") {
      setError("Нельзя понизить свою роль с администратора");
      return;
    }
    setUpdatingId(targetUser.id);
    setError(null);
    try {
      const updated = await usersApi.updateUserRole(targetUser.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
    } catch (e: any) {
      setError(e?.message ?? "Не удалось обновить роль");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Управление пользователями</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <Card className="p-4 border-red-300 bg-red-50 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </Card>
        ) : (
          <div className="space-y-4">
            {users.map((u) => (
              <Card
                key={u.id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium">
                    {u.full_name || "—"}{" "}
                    {u.id === user?.id && (
                      <span className="text-xs text-muted-foreground">
                        (вы)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={u.role}
                    onValueChange={(v) => handleRoleChange(u, v)}
                    disabled={updatingId === u.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {updatingId === u.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

