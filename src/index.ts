import a from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError } from "axios-retry";
import { plainToClass, ClassConstructor } from "class-transformer";
import { validateOrReject } from "class-validator";
import FormData from "form-data";
import http from "http";
import https from "https";
import { API_URL, RETRIES, RETRY_DELAY } from "./constants";

export const axios = a.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

// In case of 429 Too Many Requests response error, request is triggered again
axiosRetry(axios, {
  retryDelay: () =>
    process.env.RETRY_DELAY ? Number(process.env.RETRY_DELAY) : RETRY_DELAY,
  retries: process.env.RETRIES ? Number(process.env.RETRIES) : RETRIES,
  retryCondition: (error) =>
    isNetworkOrIdempotentRequestError(error) || error?.response?.status === 429,
});

const baseUrl = () => process.env.API_URL || API_URL;

const headers = () => ({
  headers: {
    "x-api-key": process.env.BLOCKCHAIN_API_KEY || "",
    "x-testnet-type": process.env.TESTNET_TYPE || "ethereum-rinkeby",
  },
});

export const httpGet = async <T>(url: string): Promise<T> => {
  const { data } = await axios.get(`${baseUrl()}${url}`, headers());
  return data;
};

export const httpPost = async <T extends object>(
  url: string,
  body?: T,
  classType?: ClassConstructor<T>
): Promise<T> => {
  await validateBody(body, classType);
  const { data } = await axios.post(`${baseUrl()}${url}`, body, headers());
  return data;
};

export const postMultiForm = async (
  url: string,
  body: FormData
): Promise<any> => {
  const h = headers();
  h.headers = { ...h.headers, ...body.getHeaders() };
  const { data } = await axios.post(`${baseUrl()}${url}`, body, h);
  return data;
};

export const httpPut = async <T extends object>(
  url: string,
  body?: T,
  classType?: ClassConstructor<T>
): Promise<T> => {
  await validateBody(body, classType);
  const { data } = await axios.put(`${baseUrl()}${url}`, body, headers());
  return data;
};

export const httpDelete = async (url: string): Promise<void> => {
  await axios.delete(`${baseUrl()}${url}`, headers());
};

export const validateBody = async <T extends object>(
  body?: T,
  classType?: ClassConstructor<T>
): Promise<void> => {
  if (classType) {
    const classInstance = plainToClass(classType, body);
    await validateOrReject(classInstance);
  }
};