FROM python:3.13-rc-bookworm

WORKDIR /files

COPY --chmod=755 tools/script.sh /bin/

COPY --chmod=644 tools/req.txt /tmp/

RUN pip install -r /tmp/req.txt

ENTRYPOINT ["/bin/script.sh" ]

CMD ["daphne", "auth.asgi:application", "--bind", "0.0.0.0", "--port", "80"]

