export default function RegisterPage() {
  return (
    <main>
      <section>
        <h1>创建账号</h1>
        <form>
          <label>
            邮箱
            <input name="email" type="email" />
          </label>
          <label>
            密码
            <input name="password" type="password" />
          </label>
          <button type="submit">注册</button>
        </form>
      </section>
    </main>
  );
}
