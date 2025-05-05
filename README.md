# Deep Search Research Engine
## The key advantage of this AI-powered deep search tool lies not only in its extensive customization options—such as keyword targeting, search scope, recursive depth up to four levels, width up to seven ‘look-alikes’, date-based filtering, domain-specific or domain-excluded searches, and advanced filters based on keyword presence in answers or stop-word triggers—but also in its ability to leverage custom knowledge uploaded to the OpenAI vector store. These features empower you to produce truly original content or publish in-depth research, making it an ideal solution for creating high-quality website pages designed to attract organic traffic from Google.

This is a build version of a self-hosted SaaS application designed to perform deep research on the Internet as well as within your own knowledge base. The application is built using **Next.js 15**, **shancd/ui**, **OpenAI**, and **exa.ai**.

## Goals and Features

- **Deep Web Research:**  
  Perform extensive research by dynamically generating search queries and analyzing search results.

- **Internal Knowledge Base Integration:**  
  Utilize vector search technologies to extract insights from your own knowledge repositories.

- **AI-Powered Evaluation:**  
  Leverage advanced AI models (e.g., GPT-4.1-mini for find and o3-mini or report) to assess the relevance of search results and automatically generate follow-up queries for deeper investigation.

- **Expert Report Generation:**  
  Automatically compile detailed expert reports based on the gathered research data.

- **Multi-Language Support:**  
  The application supports multiple languages for response generation. The response language can be set through environment variables (default is English, available options include Russian, German, Spanish, French, and Italian).

## Requirements

- **API Keys:**  
  - An **OpenAI API key** is required for text generation and relevance evaluation.  
  - An **exa.ai API key** is required for executing web searches.
- **Environment Variables:**  
  Set the appropriate environment variable (e.g., `NEXT_PUBLIC_APP_HTTP_LANG`) to define the language of the responses.

## Usage

This repository contains the build version of the application. It is intended for use as is and is not meant for code modifications or further development.

*For testing purposes, the application can be deployed on a free Vercel server. Note that the free plan allows a maximum timeout of 60 seconds. For handling complex queries and ensuring stable performance, deploying on a dedicated server is recommended. If you encounter any difficulties with deployment, professional installation assistance is available for €10.*

## Support

If you find this project useful, please give it a star on GitHub. Your support is greatly appreciated!