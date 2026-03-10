"""
Модель ролей и прав доступа (RBAC)
"""
from enum import Enum
from typing import Set


class Role(str, Enum):
    """Роли пользователей"""
    GUEST = "guest"  # Неавторизованный пользователь
    USER = "user"    # Обычный пользователь
    ADMIN = "admin"  # Администратор


class Permission(str, Enum):
    """Разрешения (permissions)"""
    # Тесты
    TEST_CREATE = "test:create"           # Создание теста
    TEST_VIEW_OWN = "test:view:own"       # Просмотр своих тестов
    TEST_VIEW_ALL = "test:view:all"       # Просмотр всех тестов (админ)
    TEST_DELETE_OWN = "test:delete:own"   # Удаление своих тестов
    TEST_DELETE_ALL = "test:delete:all"   # Удаление любых тестов (админ)
    
    # Пользователи
    USER_VIEW_OWN = "user:view:own"       # Просмотр своего профиля
    USER_VIEW_ALL = "user:view:all"       # Просмотр всех пользователей (админ)
    USER_MANAGE_ROLES = "user:manage:roles"  # Управление ролями пользователей (админ)
    USER_DELETE = "user:delete"           # Удаление пользователей (админ)


# Матрица ролей и прав (role → allowed permissions)
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.GUEST: set(),  # Гость не имеет прав
    
    Role.USER: {
        Permission.TEST_CREATE,
        Permission.TEST_VIEW_OWN,
        Permission.TEST_DELETE_OWN,
        Permission.USER_VIEW_OWN,
    },
    
    Role.ADMIN: {
        # Все права обычного пользователя
        Permission.TEST_CREATE,
        Permission.TEST_VIEW_OWN,
        Permission.TEST_DELETE_OWN,
        Permission.USER_VIEW_OWN,
        # Дополнительные права администратора
        Permission.TEST_VIEW_ALL,
        Permission.TEST_DELETE_ALL,
        Permission.USER_VIEW_ALL,
        Permission.USER_MANAGE_ROLES,
        Permission.USER_DELETE,
    },
}


def get_role_permissions(role: Role) -> Set[Permission]:
    """Получить список разрешений для роли"""
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: Role, permission: Permission) -> bool:
    """Проверить, есть ли у роли указанное разрешение"""
    return permission in get_role_permissions(role)


def is_admin(role: Role) -> bool:
    """Проверить, является ли роль администраторской"""
    return role == Role.ADMIN

