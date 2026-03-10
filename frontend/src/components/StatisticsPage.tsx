import { useState } from "react";
import { Card } from "./ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { TrendingUp, TrendingDown, Users, Award, Target, Calendar } from "lucide-react";

const performanceData = [
  { month: "Сен", avgScore: 75, tests: 12 },
  { month: "Окт", avgScore: 82, tests: 18 },
  { month: "Ноя", avgScore: 78, tests: 15 },
  { month: "Дек", avgScore: 85, tests: 20 },
  { month: "Янв", avgScore: 88, tests: 22 },
  { month: "Фев", avgScore: 84, tests: 19 },
];

const testDistribution = [
  { name: "История", value: 24, color: "#5a3fc7" },
  { name: "Программирование", value: 32, color: "#7c5fd6" },
  { name: "Английский", value: 28, color: "#9b87e3" },
  { name: "Химия", value: 22, color: "#ffcc00" },
  { name: "Литература", value: 26, color: "#ffd633" },
  { name: "Физика", value: 30, color: "#8b7dd8" },
];

const groupComparison = [
  { group: "10А", avgScore: 84, students: 24 },
  { group: "10Б", avgScore: 88, students: 28 },
  { group: "10В", avgScore: 79, students: 22 },
  { group: "11А", avgScore: 91, students: 26 },
  { group: "11Б", avgScore: 86, students: 25 },
  { group: "11В", avgScore: 82, students: 23 },
];

const topStudents = [
  { name: "Данилов Артём", avgScore: 95, tests: 8, group: "10Б" },
  { name: "Белова Анна", avgScore: 92, tests: 7, group: "10А" },
  { name: "Жуков Максим", avgScore: 90, tests: 6, group: "10В" },
  { name: "Григорьева Мария", avgScore: 88, tests: 8, group: "10А" },
  { name: "Зайцева Екатерина", avgScore: 87, tests: 7, group: "10Б" },
];

export function StatisticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("6months");
  const [selectedGroup, setSelectedGroup] = useState("all");

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48 h-11 border-2 rounded-lg">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Последний месяц</SelectItem>
            <SelectItem value="3months">3 месяца</SelectItem>
            <SelectItem value="6months">6 месяцев</SelectItem>
            <SelectItem value="1year">1 год</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-48 h-11 border-2 rounded-lg">
            <Users className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все группы</SelectItem>
            <SelectItem value="10a">10А</SelectItem>
            <SelectItem value="10b">10Б</SelectItem>
            <SelectItem value="10v">10В</SelectItem>
            <SelectItem value="11a">11А</SelectItem>
            <SelectItem value="11b">11Б</SelectItem>
            <SelectItem value="11v">11В</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="p-6 border-2 border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Средний балл</span>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-semibold mb-2">85%</p>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+3% за месяц</span>
          </div>
        </Card>

        <Card className="p-6 border-2 border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Прохождений</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold mb-2">186</p>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+12 за неделю</span>
          </div>
        </Card>

        <Card className="p-6 border-2 border-green-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Активность</span>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold mb-2">92%</p>
          <div className="flex items-center gap-1 text-sm text-red-600">
            <TrendingDown className="w-4 h-4" />
            <span>-2% за месяц</span>
          </div>
        </Card>

        <Card className="p-6 border-2 border-yellow-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Отличников</span>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <p className="text-3xl font-semibold mb-2">42</p>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+5 за месяц</span>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card className="p-6 border-2 border-gray-100">
          <div className="mb-6">
            <h3 className="font-semibold mb-1">Динамика успеваемости</h3>
            <p className="text-sm text-muted-foreground">
              Средний балл по месяцам
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgScore" 
                name="Средний балл"
                stroke="#5a3fc7" 
                strokeWidth={3}
                dot={{ fill: '#5a3fc7', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Test Distribution */}
        <Card className="p-6 border-2 border-gray-100">
          <div className="mb-6">
            <h3 className="font-semibold mb-1">Распределение по предметам</h3>
            <p className="text-sm text-muted-foreground">
              Количество прохождений тестов
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={testDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {testDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Group Comparison */}
        <Card className="p-6 border-2 border-gray-100">
          <div className="mb-6">
            <h3 className="font-semibold mb-1">Сравнение групп</h3>
            <p className="text-sm text-muted-foreground">
              Средний балл по группам
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={groupComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="group" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="avgScore" 
                name="Средний балл"
                fill="#5a3fc7" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Students */}
        <Card className="p-6 border-2 border-gray-100">
          <div className="mb-6">
            <h3 className="font-semibold mb-1">Лучшие ученики</h3>
            <p className="text-sm text-muted-foreground">
              Топ-5 по среднему баллу
            </p>
          </div>
          <div className="space-y-4">
            {topStudents.map((student, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-600' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{student.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.group} · {student.tests} тестов
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg text-primary">{student.avgScore}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6 border-2 border-gray-100">
          <h4 className="font-semibold mb-4">Статистика по баллам</h4>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">90-100%</span>
                <span className="font-medium">32 ученика</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">75-89%</span>
                <span className="font-medium">28 учеников</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '40%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">60-74%</span>
                <span className="font-medium">12 учеников</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '17%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Ниже 60%</span>
                <span className="font-medium">5 учеников</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '7%' }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-gray-100">
          <h4 className="font-semibold mb-4">Активность по дням недели</h4>
          <div className="space-y-3">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => {
              const values = [85, 92, 78, 88, 75, 45, 30];
              return (
                <div key={day}>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground w-8">{day}</span>
                    <span className="font-medium">{values[index]}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full" 
                      style={{ width: `${values[index]}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 border-2 border-gray-100">
          <h4 className="font-semibold mb-4">Популярные тесты</h4>
          <div className="space-y-4">
            {[
              { name: "Программирование", completions: 32 },
              { name: "Физика", completions: 30 },
              { name: "Английский", completions: 28 },
              { name: "Литература", completions: 26 },
              { name: "История", completions: 24 },
            ].map((test, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <span className="text-sm">{test.name}</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {test.completions}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
