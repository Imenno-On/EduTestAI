import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  Search, 
  Send, 
  UserPlus,
  Filter,
  MoreVertical,
  Mail
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

const mockStudents = [
  {
    id: 1,
    name: "Алексеев Дмитрий",
    email: "d.alekseev@student.edu",
    group: "10А",
    lastTest: "История России XX века",
    score: 85,
    date: "15.10.2025"
  },
  {
    id: 2,
    name: "Белова Анна",
    email: "a.belova@student.edu",
    group: "10А",
    lastTest: "Основы программирования",
    score: 92,
    date: "12.10.2025"
  },
  {
    id: 3,
    name: "Волков Игорь",
    email: "i.volkov@student.edu",
    group: "10Б",
    lastTest: "Английская грамматика",
    score: 78,
    date: "10.10.2025"
  },
  {
    id: 4,
    name: "Григорьева Мария",
    email: "m.grigorieva@student.edu",
    group: "10А",
    lastTest: "Органическая химия",
    score: 88,
    date: "08.10.2025"
  },
  {
    id: 5,
    name: "Данилов Артём",
    email: "a.danilov@student.edu",
    group: "10Б",
    lastTest: "Физика: Законы Ньютона",
    score: 95,
    date: "02.10.2025"
  },
  {
    id: 6,
    name: "Егорова Софья",
    email: "s.egorova@student.edu",
    group: "10В",
    lastTest: "История России XX века",
    score: 73,
    date: "15.10.2025"
  },
  {
    id: 7,
    name: "Жуков Максим",
    email: "m.zhukov@student.edu",
    group: "10В",
    lastTest: "Литература: Пушкин",
    score: 90,
    date: "05.10.2025"
  },
  {
    id: 8,
    name: "Зайцева Екатерина",
    email: "e.zaitseva@student.edu",
    group: "10Б",
    lastTest: "Основы программирования",
    score: 87,
    date: "12.10.2025"
  },
];

const groups = ["Все группы", "10А", "10Б", "10В"];
const tests = [
  "История России XX века",
  "Основы программирования на Python",
  "Английская грамматика: Present Perfect",
  "Органическая химия: Углеводороды",
  "Литература: Творчество Пушкина",
  "Физика: Законы Ньютона"
];

export function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Все группы");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState("");

  const filteredStudents = mockStudents.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === "Все группы" || student.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-700";
    if (score >= 75) return "bg-blue-100 text-blue-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const handleSendTest = () => {
    console.log("Sending test:", selectedTest, "to students:", selectedStudents);
    setSendDialogOpen(false);
    setSelectedStudents([]);
    setSelectedTest("");
  };

  const toggleStudent = (id: number) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени или email..."
            className="pl-10 h-11 border-2 rounded-lg"
          />
        </div>

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-48 h-11 border-2 rounded-lg">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group} value={group}>
                {group}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={selectedStudents.length === 0}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              Разослать тест ({selectedStudents.length})
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Разослать тест ученикам</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block mb-2">Выберите тест</label>
                <Select value={selectedTest} onValueChange={setSelectedTest}>
                  <SelectTrigger className="border-2 rounded-lg">
                    <SelectValue placeholder="Выберите тест" />
                  </SelectTrigger>
                  <SelectContent>
                    {tests.map((test) => (
                      <SelectItem key={test} value={test}>
                        {test}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Тест будет отправлен {selectedStudents.length} ученикам
                </p>
                <div className="bg-accent border border-primary/20 rounded-lg p-3 max-h-32 overflow-auto">
                  {mockStudents
                    .filter((s) => selectedStudents.includes(s.id))
                    .map((s) => (
                      <div key={s.id} className="text-sm py-1">
                        {s.name} ({s.email})
                      </div>
                    ))}
                </div>
              </div>
              <Button
                onClick={handleSendTest}
                disabled={!selectedTest}
                className="w-full bg-gradient-to-r from-primary to-purple-600"
              >
                <Mail className="w-4 h-4 mr-2" />
                Отправить тест
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="border-2 rounded-lg">
          <UserPlus className="w-4 h-4 mr-2" />
          Добавить ученика
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="p-6 border-2 border-purple-100">
          <p className="text-sm text-muted-foreground mb-1">Всего учеников</p>
          <p className="text-3xl font-semibold">{mockStudents.length}</p>
        </Card>
        <Card className="p-6 border-2 border-green-100">
          <p className="text-sm text-muted-foreground mb-1">Средний балл</p>
          <p className="text-3xl font-semibold">
            {Math.round(mockStudents.reduce((sum, s) => sum + s.score, 0) / mockStudents.length)}
          </p>
        </Card>
        <Card className="p-6 border-2 border-blue-100">
          <p className="text-sm text-muted-foreground mb-1">Активных групп</p>
          <p className="text-3xl font-semibold">{groups.length - 1}</p>
        </Card>
        <Card className="p-6 border-2 border-yellow-100">
          <p className="text-sm text-muted-foreground mb-1">Выбрано</p>
          <p className="text-3xl font-semibold">{selectedStudents.length}</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-2 border-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                  onChange={toggleAll}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Ученик</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Группа</TableHead>
              <TableHead>Последний тест</TableHead>
              <TableHead>Результат</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id} className="hover:bg-gray-50">
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="rounded"
                  />
                </TableCell>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell className="text-muted-foreground">{student.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {student.group}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{student.lastTest}</TableCell>
                <TableCell>
                  <Badge className={getScoreColor(student.score)}>
                    {student.score}%
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{student.date}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Просмотреть профиль</DropdownMenuItem>
                      <DropdownMenuItem>Отправить сообщение</DropdownMenuItem>
                      <DropdownMenuItem>Посмотреть результаты</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
