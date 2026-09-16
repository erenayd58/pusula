/**
 * Çekirdek modül (`core`) dışa açık API'si. Manifest (`module.ts`) Faz 1c'de eklenir.
 * İstemci bileşenleri bu dosyayı import etmez (sunucu dosyaları da dışa açılır).
 */
export { LoginForm } from "./components/login-form";
export { LogoutButton } from "./components/logout-button";
export { FormError } from "./components/form-error";
export { login, logout, type LoginState } from "./server/actions";
export { loginSchema, type LoginInput } from "./schemas";
