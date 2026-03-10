import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { 
  Users, 
  MoreVertical, 
  Trash2, 
  Edit,
  UserPlus,
  Send
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const mockGroups = [
  {
    id: 1,
    name: "10А",
    students: 24,
    avgScore: 84,
    activeTests: 3,
    color: "purple"
  },
  {
    id: 2,
    name: "10Б",
    students: 28,
    avgScore: 88,
    activeTests: 2,
    color: "blue"
  },
  {
    id: 3,
    name: "10В",
    students: 22,
    avgScore: 79,
    activeTests: 4,
    color: "green"
  },
  {
    id: 4,
    name: "11А",
    students: 26,
    avgScore: 91,
    activeTests: 2,
    color: "yellow"
  },
  {
    id: 5,
    name: "11Б",
    students: 25,
    avgScore: 86,
    activeTests: 3,
    color: "red"
  },
  {
    id: 6,
    name: "11В",
    students: 23,
    avgScore: 82,
    activeTests: 2,
    color: "pink"
  },
];

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  purple: { bg: "bg-purple-100", border: "border-purple-200", text: "text-purple-600" },
  blue: { bg: "bg-blue-100", border: "border-blue-200", text: "text-blue-600" },
  green: { bg: "bg-green-100", border: "border-green-200", text: "text-green-600" },
  yellow: { bg: "bg-yellow-100", border: "border-yellow-200", text: "text-yellow-600" },
  red: { bg: "bg-red-100", border: "border-red-200", text: "text-red-600" },
  pink: { bg: "bg-pink-100", border: "border-pink-200", text: "text-pink-600" },
};

export function GroupsPage() {
  const [groups, setGroups] = useState(mockGroups);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const handleDelete = (id: number) => {
    setGroups(groups.filter((group) => group.id !== id));
  };

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    
    const colors = ["purple", "blue", "green", "yellow", "red", "pink"];
    const newGroup = {
      id: Date.now(),
      name: newGroupName,
      students: 0,
      avgScore: 0,
      activeTests: 0,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    
    setGroups([...groups, newGroup]);
    setNewGroupName("");
    setCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="p-6 border-2 border-purple-100">
          <p className="text-sm text-muted-foreground mb-1">Всего групп</p>
          <p className="text-3xl font-semibold">{groups.length}</p>
        </Card>
        <Card className="p-6 border-2 border-blue-100">
          <p className="text-sm text-muted-foreground mb-1">Всего учеников</p>
          <p className="text-3xl font-semibold">
            {groups.reduce((sum, g) => sum + g.students, 0)}
          </p>
        </Card>
        <Card className="p-6 border-2 border-green-100">
          <p className="text-sm text-muted-foreground mb-1">Средний балл</p>
          <p className="text-3xl font-semibold">
            {Math.round(groups.reduce((sum, g) => sum + g.avgScore, 0) / groups.length)}
          </p>
        </Card>
        <Card className="p-6 border-2 border-yellow-100">
          <p className="text-sm text-muted-foreground mb-1">Активных тестов</p>
          <p className="text-3xl font-semibold">
            {groups.reduce((sum, g) => sum + g.activeTests, 0)}
          </p>
        </Card>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary">
            <UserPlus className="w-4 h-4 mr-2" />
            Создать группу
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новую группу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block mb-2">Название группы</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Например: 10А"
                className="border-2 rounded-lg"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!newGroupName.trim()}
              className="w-full bg-gradient-to-r from-primary to-purple-600"
            >
              Создать группу
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Groups Grid */}
      <div className="grid grid-cols-3 gap-6">
        {groups.map((group) => {
          const colors = colorClasses[group.color];
          return (
            <Card
              key={group.id}
              className={`p-6 border-2 ${colors.border} hover:shadow-lg transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
                    <Users className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.students} учеников
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Добавить учеников
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Send className="w-4 h-4 mr-2" />
                      Разослать тест
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(group.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-t">
                  <span className="text-sm text-muted-foreground">Средний балл</span>
                  <Badge className={`${colors.bg} ${colors.text} hover:${colors.bg}`}>
                    {group.avgScore}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <span className="text-sm text-muted-foreground">Активных тестов</span>
                  <span className="font-medium">{group.activeTests}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Users className="w-4 h-4 mr-2" />
                  Ученики
                </Button>
                <Button 
                  size="sm" 
                  className={`flex-1 ${colors.bg} ${colors.text} hover:${colors.bg} border-0`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Тест
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <Card className="p-12 text-center border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold mb-2">Нет созданных групп</h3>
          <p className="text-muted-foreground mb-6">
            Создайте группу для организации учеников
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-purple-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Создать группу
          </Button>
        </Card>
      )}
    </div>
  );
}
