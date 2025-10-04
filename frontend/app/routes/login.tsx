import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button, Card, TextField, Flex, Text, Heading, Callout } from '@radix-ui/themes';
import api from '../lib/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;

      if (token) {
        localStorage.setItem('token', token);
        navigate('/editor');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{ minHeight: '100vh', padding: '1rem' }}
    >
      <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
        <Flex direction="column" gap="4">
          <Heading size="6" align="center">Login</Heading>

          {error && (
            <Callout.Root color="red">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Email
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Password
                </Text>
                <TextField.Root
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <Button type="submit" size="3" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Flex>
          </form>

          <Text size="2" align="center">
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-9)' }}>
              Register
            </Link>
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
