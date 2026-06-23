export default function LoginPage() {
  return (
    <main>
      <section>
        <h1>欢迎回来</h1>
        <form>
          <label>
            邮箱或用户名
            <input name="emailOrUsername" type="text" />
          </label>
          <label>
            密码
            <input name="password" type="password" />
          </label>
          <button type="submit">登录</button>
        </form>
      </section>
    </main>
  );
}
