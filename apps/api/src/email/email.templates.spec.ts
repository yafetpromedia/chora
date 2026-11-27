import { renderTemplate } from './email.templates';

describe('email templates', () => {
  it('renders branded html and a plain-text fallback', () => {
    const rendered = renderTemplate('welcome', {
      firstName: 'Liya <script>',
      schoolName: 'Everest Youth Academy',
      actionUrl: 'https://chora.awuddigitals.com',
    });

    expect(rendered.html).toContain('#147D76');
    expect(rendered.html).toContain('Awud Digitals');
    expect(rendered.html).toContain('Liya &lt;script&gt;');
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.text).toContain('Awud Digitals');
    expect(rendered.text).toContain('Liya <script>');
    expect(rendered.subject).toContain('Liya <script>');
  });

  it('drops unsafe action links and newline injection', () => {
    const rendered = renderTemplate('password_reset', {
      firstName: 'Sara\nBcc: evil@example.com',
      actionUrl: 'javascript:alert(1)',
    });
    expect(rendered.subject).not.toMatch(/[\r\n]/);
    expect(rendered.html).not.toContain('javascript:');
  });
});
