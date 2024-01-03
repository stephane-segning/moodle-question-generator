# Moodle Question Bank

## Installation

```bash
$ pnpm install
```

## Running the app

nest start -- modm category-mapping.csv output -g 3 -m gpt-3.5-turbo-16k

```bash
# development
$ OPENAI_API_KEY=sk-Vf...lj6Q pnpm run start -- modm category-mapping.csv output -g 3 -m gpt-3.5-turbo-16k

# production mode
$ OPENAI_API_KEY=sk-Vf...lj6Q pnpm run start:prod modm category-mapping.csv output -g 3 -m gpt-3.5-turbo-16k
```
